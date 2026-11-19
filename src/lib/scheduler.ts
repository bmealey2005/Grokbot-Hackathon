import type { MasteryRecord, WidgetSpec } from "./schema";

/**
 * Spaced repetition. The working implementation lands on `agent-1-core`.
 * Signatures are fixed so other agents can import them.
 */
export function applyResult(
  record: MasteryRecord,
  score: number,
  now: number,
  widget?: WidgetSpec["widget"],
): MasteryRecord {
  void record;
  void score;
  void now;
  void widget;
  throw new Error("scheduler.applyResult ships on agent-1-core");
}

export function masteryPercent(record: MasteryRecord): number {
  void record;
  throw new Error("scheduler.masteryPercent ships on agent-1-core");
}
