export const NOTES_CHAR_LIMIT = 20_000;
export const ANSWER_CHAR_LIMIT = 2_000;

/** Free-text answers pass at this score. */
export const GRADE_PASS_SCORE = 0.7;

export const NOTES_TOO_LONG = `These notes are too long to study in one pass (limit ${NOTES_CHAR_LIMIT.toLocaleString("en-US")} characters). Trim them and try again.`;

export const ANSWER_TOO_LONG = `That answer is too long to grade (limit ${ANSWER_CHAR_LIMIT.toLocaleString("en-US")} characters). Shorten it and try again.`;

export const EMPTY_NOTES = "Paste some notes first.";
