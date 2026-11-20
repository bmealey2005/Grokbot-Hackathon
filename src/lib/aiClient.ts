import {
  AnswerResultSchema,
  ExtractResponse,
  QuestionEnvelopeSchema,
  type AnswerResult,
  type ExtractRequest,
  type GradeRequest,
  type QuestionEnvelope,
  type QuestionRequest,
} from "./schema";
import type { ZodType } from "zod";

/** Browser calls give up slightly after the server's 12s attempt plus one retry. */
const CLIENT_TIMEOUT_MS = 30_000;

/**
 * Friendly failure from a study route. The message is safe to show in the UI.
 */
export class StudyClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StudyClientError";
    this.status = status;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  return fallback;
}

function friendlyHttp(status: number, payload: unknown): string {
  if (status === 400) {
    return messageFromPayload(payload, "Those notes or that answer couldn't be used. Check them and try again.");
  }
  if (status === 401 || status === 403) {
    return "The study helper isn't authorized. Ask the host to check the API key.";
  }
  if (status === 429) {
    return "The study helper is busy. Wait a moment and try again.";
  }
  return messageFromPayload(payload, "The study helper had a problem. Try again.");
}

async function postJson<T>(url: string, body: unknown, schema: ZodType<T>): Promise<T> {
  let lastError: StudyClientError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = undefined;
        }
      }

      if (!response.ok) {
        const error = new StudyClientError(friendlyHttp(response.status, payload), response.status);
        if (response.status >= 400 && response.status < 500) throw error;
        lastError = error;
        continue;
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        lastError = new StudyClientError("The study helper sent a response we couldn't use. Try again.");
        continue;
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof StudyClientError) {
        if (error.status !== undefined && error.status >= 400 && error.status < 500) throw error;
        lastError = error;
        continue;
      }
      lastError = isAbortError(error)
        ? new StudyClientError("That took too long. Try again in a moment.")
        : new StudyClientError("Couldn't reach the study helper. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new StudyClientError("Something went wrong. Try again.");
}

/**
 * Turn pasted notes into a deck.
 * Pass the notes as a string, or the `{ text, title? }` request body.
 */
export function extractDeck(text: string, title?: string): Promise<ExtractResponse>;
export function extractDeck(body: ExtractRequest): Promise<ExtractResponse>;
export function extractDeck(
  textOrBody: string | ExtractRequest,
  title?: string,
): Promise<ExtractResponse> {
  const body: ExtractRequest =
    typeof textOrBody === "string"
      ? title === undefined
        ? { text: textOrBody }
        : { text: textOrBody, title }
      : textOrBody;
  return postJson("/api/extract", body, ExtractResponse);
}

/** Ask for the next generative-UI question. */
export function fetchQuestion(req: QuestionRequest): Promise<QuestionEnvelope> {
  return postJson("/api/question", req, QuestionEnvelopeSchema);
}

/** Grade a free-text explanation against a rubric. */
export function gradeAnswer(req: GradeRequest): Promise<AnswerResult> {
  return postJson("/api/grade", req, AnswerResultSchema);
}
