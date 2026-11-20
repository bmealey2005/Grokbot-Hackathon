import { buildLocalQuestion } from "@/lib/localPractice";
import {
  QuestionEnvelopeSchema,
  WidgetSpec,
  type QuestionEnvelope,
  type QuestionRequest,
  type WidgetSpec as WidgetSpecType,
} from "@/lib/schema";
import { widgetIssues } from "./checks";
import { TEMPERATURE } from "./config";
import { callJSON } from "./claude";
import { questionSystemPrompt, questionUserPrompt } from "./prompts";
import { z } from "zod";

export interface QuestionOptions {
  apiKey?: string;
  demoFixtures: boolean;
}

export interface GeneratedQuestion {
  envelope: QuestionEnvelope;
  source: "fixtures" | "model" | "fixture-fallback" | "type-answer-fallback";
}

export function questionResponseSchema(req: QuestionRequest) {
  return z.object({
    spec: WidgetSpec.superRefine((spec, ctx) => {
      for (const message of widgetIssues(spec, req)) {
        ctx.addIssue({ code: "custom", message });
      }
    }),
  });
}

export function localTypeAnswer(req: QuestionRequest): QuestionEnvelope {
  const term = req.concept.term.trim();
  const accepted = Array.from(new Set([term, term.toLowerCase()].filter((answer) => answer.length > 0)));
  return {
    conceptIds: [req.concept.id],
    level: req.level,
    spec: {
      widget: "typeAnswer",
      props: {
        prompt: `What term matches: ${req.concept.definition}?`,
        accepted: accepted.length > 0 ? accepted : [req.concept.term],
        explanation: req.concept.definition,
      },
    },
  };
}

function conceptIdsFor(req: QuestionRequest, spec: WidgetSpecType): string[] {
  const ids = [req.concept.id];
  if (spec.widget !== "matchPairs") return ids;
  for (const neighbor of req.neighbors) {
    const mentioned = spec.props.pairs.some(
      (pair) => pair.left === neighbor.term || pair.right.includes(neighbor.term),
    );
    if (mentioned && !ids.includes(neighbor.id)) ids.push(neighbor.id);
  }
  return ids;
}

function fallbackQuestion(req: QuestionRequest): GeneratedQuestion {
  try {
    return { envelope: QuestionEnvelopeSchema.parse(buildLocalQuestion(req)), source: "fixture-fallback" };
  } catch {
    return { envelope: QuestionEnvelopeSchema.parse(localTypeAnswer(req)), source: "type-answer-fallback" };
  }
}

export async function generateQuestion(req: QuestionRequest, options: QuestionOptions): Promise<GeneratedQuestion> {
  if (options.demoFixtures || !options.apiKey) {
    return fallbackQuestion(req);
  }

  try {
    const result = await callJSON(questionSystemPrompt(), questionUserPrompt(req), questionResponseSchema(req), {
      apiKey: options.apiKey,
      temperature: TEMPERATURE.question,
      schemaName: "study_question",
      maxCompletionTokens: 2048,
    });
    return {
      envelope: QuestionEnvelopeSchema.parse({
        conceptIds: conceptIdsFor(req, result.spec),
        level: req.level,
        spec: result.spec,
      }),
      source: "model",
    };
  } catch (error) {
    console.info("[recall] question model failed; using fallback", error instanceof Error ? error.message : error);
    return fallbackQuestion(req);
  }
}
