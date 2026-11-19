import { AnswerResultSchema, GradeRequest } from "@/lib/schema";
import type { AnswerResult } from "@/lib/schema";

/**
 * Stub grader. Hits a rubric point when the answer contains one of its longer words.
 * Agent 3 replaces this with a model call.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GradeRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { rubric, answer } = parsed.data;
  const missing = rubric.filter((point) => !pointHits(point, answer));
  const score = rubric.length === 0 ? 0 : (rubric.length - missing.length) / rubric.length;
  const correct = score >= 0.8;
  const result = {
    correct,
    score,
    feedback: correct
      ? "That covers the idea."
      : "Close. A key point is still missing.",
    missing,
  } satisfies AnswerResult;

  return Response.json(AnswerResultSchema.parse(result));
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
