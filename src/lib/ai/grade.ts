import { AnswerResultSchema, type AnswerResult, type GradeRequest } from "@/lib/schema";
import { GRADE_PASS_SCORE } from "./config";

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
