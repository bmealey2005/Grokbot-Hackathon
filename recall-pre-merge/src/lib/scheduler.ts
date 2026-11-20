import type { Level, MasteryRecord, WidgetSpec } from "./schema";

/** Score at or above this promotes a concept one level (max 3) and grows the interval. */
export const PROMOTE_AT = 0.8;
/** Score below this demotes a concept one level (min 1) and resets the interval. */
export const DEMOTE_BELOW = 0.5;
/** Missed card that was already on a short, in-session interval. */
export const IN_SESSION_MS = 60_000;
/** Missed card that had been scheduled past the current session. */
export const CROSS_SESSION_MS = 10 * 60_000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3;
export const MAX_INTERVAL_MS = 30 * DAY_MS;

export function blankMastery(conceptId: string, now: number): MasteryRecord {
  return {
    conceptId,
    level: 1,
    ease: INITIAL_EASE,
    intervalMs: 0,
    dueAt: now,
    streak: 0,
    history: [],
  };
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

function roundEase(ease: number): number {
  return Math.round(ease * 100) / 100;
}

function asLevel(level: number): Level {
  if (level <= 1) return 1;
  if (level >= 3) return 3;
  return 2;
}

/**
 * Success intervals step 1 minute → 10 minutes → 1 day → 3 days, then multiply
 * by ease. A card that is already further out keeps growing from its current interval.
 */
export function grownIntervalMs(currentMs: number, ease: number, streakAfter: number): number {
  const ladder: Record<number, number> = {
    1: IN_SESSION_MS,
    2: CROSS_SESSION_MS,
    3: DAY_MS,
    4: 3 * DAY_MS,
  };
  const stepped = ladder[streakAfter] ?? Math.round(Math.max(currentMs, 3 * DAY_MS) * ease);
  if (currentMs <= 0) return Math.min(MAX_INTERVAL_MS, stepped);
  return Math.min(MAX_INTERVAL_MS, Math.max(stepped, Math.round(currentMs * ease)));
}

export function applyResult(
  record: MasteryRecord,
  score: number,
  now: number,
  widget: WidgetSpec["widget"] = "typeAnswer",
): MasteryRecord {
  const clamped = clampScore(score);
  const history = [...record.history, { at: now, score: clamped, widget }];

  if (clamped >= PROMOTE_AT) {
    const ease = Math.min(MAX_EASE, roundEase(record.ease + 0.1));
    const streak = record.streak + 1;
    const intervalMs = grownIntervalMs(record.intervalMs, ease, streak);
    return {
      ...record,
      level: asLevel(record.level + 1),
      ease,
      intervalMs,
      dueAt: now + intervalMs,
      streak,
      history,
    };
  }

  if (clamped < DEMOTE_BELOW) {
    const ease = Math.max(MIN_EASE, roundEase(record.ease - 0.2));
    const intervalMs = record.intervalMs > CROSS_SESSION_MS ? CROSS_SESSION_MS : IN_SESSION_MS;
    return {
      ...record,
      level: asLevel(record.level - 1),
      ease,
      intervalMs,
      dueAt: now + intervalMs,
      streak: 0,
      history,
    };
  }

  const base = Math.max(record.intervalMs, IN_SESSION_MS);
  const intervalMs = Math.min(MAX_INTERVAL_MS, Math.round(base * 1.2));
  return {
    ...record,
    intervalMs,
    dueAt: now + intervalMs,
    history,
  };
}

/** 0–100 for the results map. Level carries most of the weight; recent scores and streak fill the rest. */
export function masteryPercent(record: MasteryRecord): number {
  const levelPart = ((record.level - 1) / 2) * 70;
  const recent = record.history.slice(-5);
  const average =
    recent.length === 0 ? 0 : recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length;
  const scorePart = average * 20;
  const streakPart = Math.min(record.streak, 5) * 2;
  return Math.round(Math.min(100, Math.max(0, levelPart + scorePart + streakPart)));
}
