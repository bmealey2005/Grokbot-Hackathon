import { describe, expect, it } from "vitest";
import {
  CROSS_SESSION_MS,
  DAY_MS,
  IN_SESSION_MS,
  MAX_EASE,
  MAX_INTERVAL_MS,
  MIN_EASE,
  applyResult,
  blankMastery,
  masteryPercent,
} from "./scheduler";
import type { MasteryRecord } from "./schema";

function withRecord(patch: Partial<MasteryRecord> & Pick<MasteryRecord, "conceptId">): MasteryRecord {
  return { ...blankMastery(patch.conceptId, 0), ...patch };
}

describe("applyResult", () => {
  it("promotes a level and grows the interval at 0.8 or above", () => {
    let record = blankMastery("mitochondria", 0);
    record = applyResult(record, 0.8, 0, "multipleChoice");
    expect(record.level).toBe(2);
    expect(record.streak).toBe(1);
    expect(record.intervalMs).toBe(IN_SESSION_MS);
    expect(record.dueAt).toBe(IN_SESSION_MS);
    expect(record.history).toEqual([{ at: 0, score: 0.8, widget: "multipleChoice" }]);

    record = applyResult(record, 1, 1_000);
    expect(record.level).toBe(3);
    expect(record.intervalMs).toBe(CROSS_SESSION_MS);
    expect(record.intervalMs).toBeGreaterThan(IN_SESSION_MS);

    const before = record.intervalMs;
    record = applyResult(record, 1, 2_000);
    expect(record.level).toBe(3);
    expect(record.streak).toBe(3);
    expect(record.intervalMs).toBe(DAY_MS);
    expect(record.intervalMs).toBeGreaterThan(before);
    expect(record.ease).toBeGreaterThan(2.5);
    expect(record.ease).toBeLessThanOrEqual(MAX_EASE);
  });

  it("does not promote past level 3 and caps a mature interval", () => {
    const record = withRecord({
      conceptId: "atp",
      level: 3,
      streak: 10,
      ease: MAX_EASE,
      intervalMs: MAX_INTERVAL_MS,
    });
    const next = applyResult(record, 1, 0);
    expect(next.level).toBe(3);
    expect(next.intervalMs).toBe(MAX_INTERVAL_MS);
    expect(next.ease).toBe(MAX_EASE);
  });

  it("demotes below 0.5 and resets a long interval to 10 minutes", () => {
    const record = withRecord({
      conceptId: "meiosis",
      level: 3,
      streak: 4,
      ease: 2.5,
      intervalMs: DAY_MS,
    });
    const next = applyResult(record, 0.49, 5_000, "explain");
    expect(next.level).toBe(2);
    expect(next.streak).toBe(0);
    expect(next.intervalMs).toBe(CROSS_SESSION_MS);
    expect(next.dueAt).toBe(5_000 + CROSS_SESSION_MS);
    expect(next.ease).toBeLessThan(2.5);
    expect(next.history.at(-1)?.widget).toBe("explain");
  });

  it("resets an in-session miss to 1 minute and does not demote below level 1", () => {
    const inSession = applyResult(
      withRecord({ conceptId: "osmosis", level: 2, intervalMs: IN_SESSION_MS }),
      0,
      0,
    );
    expect(inSession.level).toBe(1);
    expect(inSession.intervalMs).toBe(IN_SESSION_MS);

    const floor = applyResult(blankMastery("osmosis", 0), 0, 0);
    expect(floor.level).toBe(1);
    expect(floor.intervalMs).toBe(IN_SESSION_MS);

    const eased = applyResult(withRecord({ conceptId: "osmosis", ease: MIN_EASE, intervalMs: DAY_MS, level: 2 }), 0, 0);
    expect(eased.ease).toBe(MIN_EASE);
  });

  it("holds the level for a partial score and still moves the card forward", () => {
    const record = withRecord({ conceptId: "enzyme", level: 2, streak: 2, intervalMs: IN_SESSION_MS });
    const held = applyResult(record, 0.5, 10);
    expect(held.level).toBe(2);
    expect(held.streak).toBe(2);
    expect(held.ease).toBe(record.ease);
    expect(held.intervalMs).toBe(Math.round(IN_SESSION_MS * 1.2));

    const justUnder = applyResult(record, 0.79, 10);
    expect(justUnder.level).toBe(2);
  });
});

describe("masteryPercent", () => {
  it("starts at 0 and reaches 100 for a strong level-3 record", () => {
    expect(masteryPercent(blankMastery("dna", 0))).toBe(0);
    const mastered = withRecord({
      conceptId: "dna",
      level: 3,
      streak: 5,
      history: Array.from({ length: 5 }, () => ({ at: 0, score: 1, widget: "cloze" as const })),
    });
    expect(masteryPercent(mastered)).toBe(100);
  });
});
