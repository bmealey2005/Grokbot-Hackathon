import { AnswerResultSchema, GradeRequest } from "@/lib/schema";
import type { AnswerResult } from "@/lib/schema";
import { invalidJson, readJson } from "../readJson";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 260_000);
  } catch (error) {
    return invalidJson(error);
  }

  const parsed = GradeRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const rubric = parsed.data.rubric.map((point) => point.trim()).filter(Boolean);
  const answer = parsed.data.answer.trim();
  if (!answer || !rubric.length) {
    return Response.json({ error: "A response and a grading rubric are required" }, { status: 400 });
  }

  const words = new Set(keywords(answer));
  const missing = rubric.filter((point) => !pointHits(point, words, answer));
  const score = (rubric.length - missing.length) / rubric.length;
  const correct = score >= 0.8;
  const result = {
    correct,
    score,
    feedback: correct ? "Your answer matched the rubric's key terms." : "Compare your answer with the points below.",
    missing,
  } satisfies AnswerResult;

  return Response.json(AnswerResultSchema.parse(result));
}

const skipped = new Set(["through", "which", "where", "their", "these", "there", "about", "would", "could", "should", "while"]);

function keywords(text: string): string[] {
  const words = text.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return words.filter((word) => !skipped.has(word)).map((word) => word.replace(/^(.{4,}?)(?:ing|ed|es|s)$/u, "$1"));
}

function pointHits(point: string, words: Set<string>, answer: string): boolean {
  const required = [...new Set(keywords(point))];
  if (!required.length) return answer.toLocaleLowerCase().includes(point.toLocaleLowerCase());
  return required.filter((word) => words.has(word)).length >= Math.ceil(required.length * 0.6);
}
