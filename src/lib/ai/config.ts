/** Current Claude model. Sonnet 5.5 supports JSON-schema structured output. */
export const CLAUDE_MODEL = "claude-sonnet-5-5";

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

/** Messages API version that accepts output_config JSON schemas. */
export const ANTHROPIC_VERSION = "2026-10-21";

/** Per-attempt limit. `callJSON` retries once after this. */
export const AI_TIMEOUT_MS = 12_000;

export const NOTES_CHAR_LIMIT = 20_000;
export const ANSWER_CHAR_LIMIT = 2_000;

/** Free-text answers pass at this score. */
export const GRADE_PASS_SCORE = 0.7;

export const TEMPERATURE = {
  extract: 0.2,
  enrich: 0.1,
  question: 0.3,
  grade: 0.1,
} as const;

export const NOTES_TOO_LONG = `These notes are too long to study in one pass (limit ${NOTES_CHAR_LIMIT.toLocaleString("en-US")} characters). Trim them and try again.`;

export const ANSWER_TOO_LONG = `That answer is too long to grade (limit ${ANSWER_CHAR_LIMIT.toLocaleString("en-US")} characters). Shorten it and try again.`;

export const EMPTY_NOTES = "Paste some notes first.";
