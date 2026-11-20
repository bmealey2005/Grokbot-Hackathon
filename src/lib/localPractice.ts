import { sampleDeck, widgetSpecs } from "@/fixtures";
import type { Concept, Deck, Level, QuestionEnvelope, QuestionRequest, WidgetSpec } from "@/lib/schema";

export const MAX_SOURCE_LENGTH = 40_000;
const MAX_CONCEPTS = 24;
const MAX_TITLE_LENGTH = 120;
const headingPattern = /^(?:#{1,6}\s+|\d{1,3}[.)]\s+)(.+)$/;
const numberedHeadingPattern = /^(\d{1,3})[.)]\s+/;
const sampleQuestions: { level: Level; conceptIds: string[]; spec: WidgetSpec }[] = [
  { level: 1, conceptIds: ["mitochondria"], spec: widgetSpecs.multipleChoice },
  { level: 1, conceptIds: ["mitosis"], spec: widgetSpecs.trueFalse },
  { level: 2, conceptIds: ["dna"], spec: widgetSpecs.cloze },
  { level: 2, conceptIds: ["osmosis"], spec: widgetSpecs.typeAnswer },
  { level: 2, conceptIds: ["mitochondria", "chloroplast", "ribosome", "nucleus"], spec: widgetSpecs.matchPairs },
  { level: 3, conceptIds: ["mitosis"], spec: widgetSpecs.orderSteps },
  { level: 3, conceptIds: ["atp"], spec: widgetSpecs.slider },
  { level: 3, conceptIds: ["enzyme"], spec: widgetSpecs.explain },
];

function oneLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function firstSentence(text: string) {
  return oneLine(text.split(/(?<=[.!?])\s+/u, 1)[0]);
}

function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  const ending = text.lastIndexOf(" ", max - 1);
  return `${text.slice(0, ending > max / 2 ? ending : max - 1)}…`;
}

/** Keep the original text for evidence, while using short labels for the widgets. */
export function buildLocalDeck(text: string, title?: string): Deck {
  const paragraphs = text.trim()
    .split(/\r?\n[ \t]*\r?\n+/u)
    .flatMap((paragraph) => paragraph.split(/\r?\n(?=#{1,6}\s+|\d{1,3}[.)]\s+)/u))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const firstLine = paragraphs[0].split(/\r?\n/u, 1)[0];
  const detectedTitle = headingPattern.exec(firstLine)?.[1] ?? firstSentence(firstLine);
  const finalTitle = shorten(oneLine(title ?? "") || detectedTitle, MAX_TITLE_LENGTH);
  const id = `reading-${crypto.randomUUID()}`;
  const concepts: Concept[] = [];
  let pendingHeading = "";

  for (const [index, paragraph] of paragraphs.entries()) {
    if (concepts.length === MAX_CONCEPTS) break;
    const [line, ...rest] = paragraph.split(/\r?\n/u);
    const markedHeading = headingPattern.exec(line)?.[1] ?? "";
    const numberedHeading = numberedHeadingPattern.test(line) ? markedHeading : "";
    const inlineDefinition = /^([^:\n]{1,80}):\s+(.+)$/u.exec(line);
    const shortHeading = !/[.!?。！？]$/u.test(line) && line.split(/\s+/u).length <= 7;
    if (shortHeading && !rest.length && !inlineDefinition && !numberedHeading && index < paragraphs.length - 1) {
      pendingHeading = markedHeading || line;
      continue;
    }

    const sentence = firstSentence(paragraph);
    const subject = /^(.{2,76}?)\s+(?:is|are|refers to|means|describes|produces)\s+/iu.exec(sentence)?.[1];
    const sectionHeading = rest.length && (markedHeading || shortHeading) ? markedHeading || line : "";
    const fallbackLabel = sentence.split(/\s+/u).slice(0, 5).join(" ").replace(/[.!?;:,]$/u, "");
    const term = shorten(oneLine(sectionHeading || numberedHeading || inlineDefinition?.[1] || pendingHeading || subject || fallbackLabel), 90);
    const description = sectionHeading ? rest.join("\n") : numberedHeading || inlineDefinition?.[2] || paragraph;
    const definition = shorten(firstSentence(description), 420);
    if (!term || !definition) continue;
    concepts.push({ id: `${id}-${concepts.length + 1}`, term, definition, facts: [paragraph], related: [] });
    pendingHeading = "";
  }

  for (const [index, concept] of concepts.entries()) {
    const start = Math.max(0, Math.min(index - 3, concepts.length - 7));
    concept.related = concepts.slice(start, start + 7).filter((item) => item !== concept).map((item) => item.id);
  }

  return { id, title: finalTitle, concepts, createdAt: Date.now() };
}

export function buildLocalQuestion(request: QuestionRequest): QuestionEnvelope {
  const { concept, level, neighbors, recentWidgets } = request;
  const sample = sampleDeck.concepts.some((item) => item.id === concept.id && item.definition === concept.definition);
  const curated = sample ? sampleQuestions.find((item) => item.level === level && item.conceptIds.includes(concept.id)) : undefined;

  const seen = new Set([concept.term.toLowerCase()]);
  const pool = [concept];
  for (const neighbor of sample ? [...neighbors, ...sampleDeck.concepts] : neighbors) {
    const term = neighbor.term.toLowerCase();
    if (!term || seen.has(term)) continue;
    seen.add(term);
    pool.push(neighbor);
    if (pool.length === 6) break;
  }

  const escapedTerm = concept.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cue = concept.definition.replace(new RegExp(escapedTerm, "giu"), "____");
  const prompt = /[\p{L}\p{N}]/u.test(cue) ? `Which term matches this idea? ${cue}` : `Recall this part of the reading: ${concept.term}`;
  const recall: WidgetSpec = {
    widget: "typeAnswer",
    props: { prompt, accepted: [concept.term], explanation: concept.definition },
  };
  const choices: WidgetSpec[] = curated ? [curated.spec] : [];
  if (level === 1 && pool.length >= 3) {
    const options = pool.slice(1, 4).map((item) => item.term);
    const correctIndex = concept.term.length % (options.length + 1);
    options.splice(correctIndex, 0, concept.term);
    choices.push({
      widget: "multipleChoice",
      props: { prompt, options, correctIndex, explanation: concept.definition },
    });
  }

  const other = pool.find((item) => item.definition !== concept.definition);
  if (level === 1 && other) {
    const answer = concept.term.length % 2 === 0;
    choices.push({ widget: "trueFalse", props: {
      statement: `${concept.term} fits this description: ${(answer ? concept : other).definition}`,
      answer,
      explanation: concept.definition,
    } });
  }

  if (level === 3) {
    const numbered = pool.flatMap((item) => {
      const match = numberedHeadingPattern.exec(item.facts[0] ?? "");
      return match ? [{ item, order: Number(match[1]) }] : [];
    });
    if (numbered.some(({ item }) => item.id === concept.id) && numbered.length >= 3 && new Set(numbered.map(({ order }) => order)).size === numbered.length) {
      numbered.sort((a, b) => a.order - b.order);
      choices.push({ widget: "orderSteps", props: {
        prompt: `Put the steps from the reading in order, including ${concept.term}.`,
        steps: numbered.map(({ item }) => item.term),
        explanation: "This follows the numbered sequence in the reading.",
      } });
    }
  }

  if (pool.length >= 3 && new Set(pool.map((item) => item.definition)).size === pool.length) {
    choices.push({ widget: "matchPairs", props: {
      prompt: `Match each idea to its description, including ${concept.term}.`,
      pairs: pool.map((item) => ({ left: item.term, right: item.definition })),
    } });
  }

  if (level === 3) {
    choices.push({ widget: "explain", props: { prompt: `Explain ${concept.term} in your own words.`, rubric: [concept.definition] } });
  }
  choices.push(recall);

  const spec = choices.find((choice) => !recentWidgets.includes(choice.widget)) ?? choices[recentWidgets.length % choices.length];
  const conceptIds = curated?.spec === spec ? curated.conceptIds : spec.widget === "orderSteps"
    ? pool.filter((item) => spec.props.steps.includes(item.term)).map((item) => item.id)
    : spec.widget === "matchPairs" ? pool.map((item) => item.id) : [concept.id];
  return { spec, level, conceptIds };
}
