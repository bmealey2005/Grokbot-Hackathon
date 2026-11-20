import { AnswerResultSchema, type AnswerResult, type GradeRequest } from "@/lib/schema";
import { GRADE_PASS_SCORE, TEMPERATURE } from "./config";
import { callJSON } from "./claude";
import { gradeSystemPrompt, gradeUserPrompt } from "./prompts";
import { z } from "zod";

const gradeModelSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string(),
  missing: z.array(z.string()),
});

export interface GradeOptions {
  apiKey?: string;
  demoFixtures: boolean;
}

export interface GradedAnswer {
  result: AnswerResult;
  source: "fixtures" | "model" | "heuristic-fallback";
}

function pointHits(point: string, answer: string): boolean {
  const keywords = point.toLowerCase().match(/[a-z0-9]{5,}/g) ?? [];
  const haystack = answer.toLowerCase();
  if (keywords.length === 0) {
    const needle = point.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  }
  return keywords.some((word) => haystack.includes(word));
}

/** Offline grader. Same keyword check the scaffold used, with the 0.7 pass line. */
export function heuristicGrade(body: GradeRequest): AnswerResult {
  const missing = body.rubric.filter((point) => !pointHits(point, body.answer));
  const score = body.rubric.length === 0 ? 0 : (body.rubric.length - missing.length) / body.rubric.length;
  const correct = score >= GRADE_PASS_SCORE;
  return AnswerResultSchema.parse({
    correct,
    score,
    feedback: correct ? "That covers the idea." : "Close. A key point is still missing.",
    missing,
  });
}

function oneSentence(feedback: string, fallback: string): string {
  const cleaned = feedback.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  const match = cleaned.match(/^.*?[.!?](?=\s|$)/);
  return match?.[0] ?? cleaned;
}

function alignMissing(rubric: string[], missing: string[]): string[] {
  const known = new Set(rubric);
  const exact = missing.map((item) => item.trim()).filter((item) => known.has(item));
  if (exact.length > 0 || missing.length === 0) return Array.from(new Set(exact));
  const lowered = missing.map((item) => item.toLowerCase());
  return rubric.filter((point) =>
    lowered.some((item) => item.includes(point.toLowerCase()) || point.toLowerCase().includes(item)),
  );
}

export async function gradeSubmittedAnswer(body: GradeRequest, options: GradeOptions): Promise<GradedAnswer> {
  if (options.demoFixtures || !options.apiKey) {
    return { result: heuristicGrade(body), source: "fixtures" };
  }

  try {
    const model = await callJSON(gradeSystemPrompt(), gradeUserPrompt(body), gradeModelSchema, {
      apiKey: options.apiKey,
      temperature: TEMPERATURE.grade,
      schemaName: "grade_result",
      maxCompletionTokens: 800,
    });
    const score = Math.min(1, Math.max(0, model.score));
    const correct = score >= GRADE_PASS_SCORE;
    const missing = alignMissing(body.rubric, model.missing);
    const fallback = correct
      ? "That covers the idea."
      : missing[0]
        ? `Close. Bring in this idea: ${missing[0]}.`
        : "Close. A key point is still missing.";
    return {
      result: AnswerResultSchema.parse({
        correct,
        score,
        feedback: oneSentence(model.feedback, fallback),
        missing,
      }),
      source: "model",
    };
  } catch (error) {
    console.info("[recall] grade model failed; using heuristic", error instanceof Error ? error.message : error);
    return { result: heuristicGrade(body), source: "heuristic-fallback" };
  }
}
