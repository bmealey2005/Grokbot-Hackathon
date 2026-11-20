export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,;:!?]+|[.,;:!?]+$/g, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  let prev = new Array<number>(bLen + 1);
  let curr = new Array<number>(bLen + 1);
  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    const aCode = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      const cost = aCode === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub;
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[bLen];
}

/** Case, whitespace, and accents. One edit is allowed once the answer is 5+ letters. */
export function matchesAccepted(input: string, accepted: readonly string[]): boolean {
  const guess = normalizeAnswer(input);
  if (!guess) return false;
  return accepted.some((candidate) => {
    const target = normalizeAnswer(candidate);
    if (!target) return false;
    if (guess === target) return true;
    if (target.length < 5) return false;
    return levenshtein(guess, target) <= 1;
  });
}

/** Fraction of correctly ordered pairs. 1 when the sequence matches. */
export function pairwiseOrderScore(correct: readonly string[], attempt: readonly string[]): number {
  const position = new Map<string, number>();
  attempt.forEach((item, index) => {
    if (!position.has(item)) position.set(item, index);
  });
  let total = 0;
  let good = 0;
  for (let i = 0; i < correct.length; i++) {
    for (let j = i + 1; j < correct.length; j++) {
      total += 1;
      const left = position.get(correct[i]);
      const right = position.get(correct[j]);
      if (left !== undefined && right !== undefined && left < right) good += 1;
    }
  }
  return total === 0 ? 1 : good / total;
}

export function scoreSlider(
  value: number,
  answer: number,
  tolerance: number,
): { correct: boolean; score: number } {
  const delta = Math.abs(value - answer);
  const band = Math.abs(tolerance);
  if (delta <= band + 1e-9) return { correct: true, score: 1 };
  if (delta <= band * 2 + 1e-9) return { correct: false, score: 0.5 };
  return { correct: false, score: 0 };
}

export function scoreBlanks(
  guesses: readonly string[],
  accepted: readonly (readonly string[])[],
): { correct: boolean; score: number; hits: boolean[] } {
  const hits = guesses.map((guess, index) => matchesAccepted(guess, accepted[index] ?? []));
  const score = hits.length === 0 ? 0 : hits.filter(Boolean).length / hits.length;
  return { correct: hits.length > 0 && hits.every(Boolean), score, hits };
}

export function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  if (next.length > 1 && next.every((item, index) => Object.is(item, items[index]))) {
    const tmp = next[0];
    next[0] = next[1];
    next[1] = tmp;
  }
  return next;
}
