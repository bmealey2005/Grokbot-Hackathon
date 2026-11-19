import type {
  AnswerResult,
  ExtractRequest,
  ExtractResponse,
  GradeRequest,
  QuestionEnvelope,
  QuestionRequest,
} from "./schema";

/**
 * Typed fetch wrappers for the study API.
 * Agent 3 owns timeouts, a single retry, and zod validation in this file.
 * Until then these return whatever the fixture-backed routes send.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function extractDeck(body: ExtractRequest): Promise<ExtractResponse> {
  return postJson("/api/extract", body);
}

export function fetchQuestion(body: QuestionRequest): Promise<QuestionEnvelope> {
  return postJson("/api/question", body);
}

export function gradeAnswer(body: GradeRequest): Promise<AnswerResult> {
  return postJson("/api/grade", body);
}
