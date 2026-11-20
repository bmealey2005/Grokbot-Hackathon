export type AIErrorCode =
  | "timeout"
  | "network"
  | "http"
  | "empty"
  | "invalid_json"
  | "schema"
  | "missing_key";

/** Failure from the model client after the single retry is exhausted. */
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;

  constructor(code: AIErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AIError";
    this.code = code;
    this.status = options?.status;
  }
}
