export interface QuizletPair {
  term: string;
  definition: string;
}

/** Term, spaces, a dash, spaces, definition. Hyphens inside a word do not count. */
const DASH_PAIR = /^(.{1,120}?)\s+[-–—]\s+(\S.*)$/;

/**
 * Fast path for a Quizlet-style export.
 * Returns pairs when most non-empty lines are `term<TAB>definition` or `term - definition`.
 */
export function parseQuizlet(text: string): QuizletPair[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const pairs: QuizletPair[] = [];
  for (const line of lines) {
    const tab = line.indexOf("\t");
    if (tab > 0) {
      const term = line.slice(0, tab).trim();
      const definition = line.slice(tab + 1).trim();
      if (term && definition) {
        pairs.push({ term, definition });
        continue;
      }
    }
    const dash = DASH_PAIR.exec(line);
    if (!dash) continue;
    const term = dash[1].trim();
    const definition = dash[2].trim();
    if (term && definition) pairs.push({ term, definition });
  }

  if (pairs.length < 2) return null;
  if (pairs.length / lines.length <= 0.5) return null;
  return pairs;
}
