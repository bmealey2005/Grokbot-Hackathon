import { buildLocalDeck } from "@/lib/localPractice";
import { Deck, type ExtractRequest } from "@/lib/schema";
import { buildDeck, groundedFacts, type RawConcept } from "./concepts";
import { TEMPERATURE } from "./config";
import { callJSON } from "./claude";
import { enrichSystemPrompt, enrichUserPrompt, extractSystemPrompt, extractUserPrompt } from "./prompts";
import { parseQuizlet } from "./quizlet";
import { z } from "zod";

const extractedConceptSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  facts: z.array(z.string()).max(3).optional(),
  related: z.array(z.string()).optional(),
});

const extractModelSchema = z
  .object({
    title: z.string().min(1),
    concepts: z.array(extractedConceptSchema).min(5).max(25),
  })
  .superRefine((value, ctx) => {
    value.concepts.forEach((concept, index) => {
      const words = concept.definition.trim().split(/\s+/).filter(Boolean);
      if (words.length > 25) {
        ctx.addIssue({
          code: "custom",
          message: `concepts.${index}.definition is ${words.length} words; the maximum is 25.`,
        });
      }
    });
  });

const enrichModelSchema = z.object({
  concepts: z.array(
    z.object({
      term: z.string(),
      facts: z.array(z.string()).max(3),
    }),
  ),
});

export interface ExtractOptions {
  apiKey?: string;
  /** DEMO_MODE=fixtures. Skips parsing and the model. */
  demoFixtures: boolean;
}

export interface Extraction {
  deck: Deck;
  source: "fixtures" | "quizlet" | "model" | "local";
}

function deckFromRaw(title: string | undefined, raw: RawConcept[], source: string, fallbackTitle: string): Deck {
  return Deck.parse(buildDeck(title?.trim() || fallbackTitle, raw, source));
}

async function enrichPairs(text: string, raw: RawConcept[], apiKey: string): Promise<RawConcept[]> {
  const enriched = await callJSON(enrichSystemPrompt(), enrichUserPrompt(text, raw), enrichModelSchema, {
    apiKey,
    temperature: TEMPERATURE.enrich,
    schemaName: "quizlet_facts",
    maxCompletionTokens: 2048,
  });
  const byTerm = new Map(enriched.concepts.map((concept) => [concept.term.trim().toLowerCase(), concept.facts]));
  return raw.map((concept) => ({
    ...concept,
    facts: groundedFacts(byTerm.get(concept.term.toLowerCase()) ?? [], text),
  }));
}

/** Offline deck: Quizlet rows when they match, otherwise the shared local reader. */
export function localDeckFromText(text: string, title?: string): Deck {
  const pairs = parseQuizlet(text);
  if (pairs) {
    return deckFromRaw(
      title,
      pairs.map((pair) => ({ term: pair.term, definition: pair.definition, facts: [], related: [] })),
      text,
      "Imported cards",
    );
  }
  return Deck.parse(buildLocalDeck(text, title));
}

export async function extractDeckFromNotes(body: ExtractRequest, options: ExtractOptions): Promise<Extraction> {
  const title = body.title?.trim() || undefined;
  if (options.demoFixtures || !options.apiKey) {
    return { deck: localDeckFromText(body.text, title), source: options.demoFixtures ? "fixtures" : "local" };
  }

  const pairs = parseQuizlet(body.text);
  if (pairs) {
    let raw: RawConcept[] = pairs.map((pair) => ({
      term: pair.term,
      definition: pair.definition,
      facts: [],
      related: [],
    }));
    if (options.apiKey) {
      try {
        raw = await enrichPairs(body.text, raw, options.apiKey);
      } catch (error) {
        console.info(
          "[recall] quizlet fact enrichment skipped",
          error instanceof Error ? error.message : error,
        );
      }
    }
    return {
      deck: deckFromRaw(title, raw, body.text, "Imported cards"),
      source: "quizlet",
    };
  }

  try {
    const model = await callJSON(extractSystemPrompt(), extractUserPrompt(body.text, title), extractModelSchema, {
      apiKey: options.apiKey,
      temperature: TEMPERATURE.extract,
      schemaName: "study_deck",
      maxCompletionTokens: 4096,
    });
    const raw: RawConcept[] = model.concepts.map((concept) => ({
      term: concept.term,
      definition: concept.definition,
      facts: groundedFacts(concept.facts ?? [], body.text),
      related: concept.related ?? [],
    }));
    return {
      deck: deckFromRaw(title || model.title, raw, body.text, "Study deck"),
      source: "model",
    };
  } catch (error) {
    console.info("[recall] extract model failed; using local parse", error instanceof Error ? error.message : error);
    return { deck: localDeckFromText(body.text, title), source: "local" };
  }
}
