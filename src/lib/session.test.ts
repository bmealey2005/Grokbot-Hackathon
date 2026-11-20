import { envelopeFromFixture } from "@/fixtures";
import { describe, expect, it } from "vitest";
import { blankMastery, masteryPercent } from "./scheduler";
import {
  createSessionRunner,
  nextQuestionRequest,
  type SessionRunner,
} from "./session";
import type { Deck, MasteryRecord, QuestionRequest } from "./schema";

function deckOf(ids: string[]): Deck {
  return {
    id: "deck",
    title: "Deck",
    createdAt: 0,
    concepts: ids.map((id) => ({
      id,
      term: id,
      definition: `${id} means something specific`,
      facts: [],
      related: ids.filter((other) => other !== id).slice(0, 2),
    })),
  };
}

function record(conceptId: string, patch: Partial<MasteryRecord> = {}): MasteryRecord {
  return { ...blankMastery(conceptId, 0), conceptId, ...patch };
}

async function whenIdle(runner: SessionRunner) {
  if (!runner.getSnapshot().isLoading) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = runner.subscribe(() => {
      if (!runner.getSnapshot().isLoading) {
        unsubscribe();
        resolve();
      }
    });
  });
}

describe("nextQuestionRequest", () => {
  const deck = deckOf(["a", "b", "c"]);
  const now = 1_000;

  it("orders due concepts by how overdue they are", () => {
    const mastery = {
      a: record("a", { dueAt: 100, level: 2 }),
      b: record("b", { dueAt: 50, level: 1 }),
      c: record("c", { dueAt: 5_000, level: 1 }),
    };
    const request = nextQuestionRequest(deck, mastery, [], now);
    expect(request?.concept.id).toBe("b");
    expect(request?.level).toBe(1);
    expect(request?.neighbors.every((neighbor) => neighbor.id !== "b")).toBe(true);
  });

  it("picks the weakest concept when nothing is due", () => {
    const strong = record("a", {
      dueAt: 5_000,
      level: 3,
      streak: 5,
      history: Array.from({ length: 5 }, () => ({ at: 0, score: 1, widget: "cloze" as const })),
    });
    const weak = record("b", { dueAt: 9_000, level: 1 });
    const middle = record("c", {
      dueAt: 8_000,
      level: 2,
      streak: 1,
      history: [{ at: 0, score: 1, widget: "typeAnswer" as const }],
    });
    expect(masteryPercent(strong)).toBeGreaterThan(masteryPercent(middle));
    expect(masteryPercent(middle)).toBeGreaterThan(masteryPercent(weak));

    const request = nextQuestionRequest(deck, { a: strong, b: weak, c: middle }, [], now);
    expect(request?.concept.id).toBe("b");
    expect(request?.level).toBe(1);
  });

  it("does not ask the same concept twice in a row", () => {
    const mastery = {
      a: record("a", { dueAt: 100, level: 2 }),
      b: record("b", { dueAt: 50, level: 3 }),
      c: record("c", { dueAt: 5_000, level: 1 }),
    };
    const request = nextQuestionRequest(deck, mastery, [{ conceptId: "b", widget: "cloze" }], now);
    expect(request?.concept.id).toBe("a");
    expect(request?.recentWidgets).toEqual(["cloze"]);
    expect(request?.level).toBe(2);
  });

  it("repeats the only concept in a one-card deck and keeps the last widgets", () => {
    const solo = deckOf(["only"]);
    const recent = Array.from({ length: 8 }, () => ({
      conceptId: "only",
      widget: "slider" as const,
    }));
    const request = nextQuestionRequest(
      solo,
      { only: record("only", { level: 2, dueAt: 0 }) },
      recent,
      10,
    );
    expect(request?.concept.id).toBe("only");
    expect(request?.level).toBe(2);
    expect(request?.recentWidgets).toHaveLength(6);
  });

  it("returns null for an empty deck", () => {
    expect(nextQuestionRequest({ ...deck, concepts: [] }, {}, [], now)).toBeNull();
  });
});

describe("prefetch", () => {
  it("fetches the next question while the current one is unanswered and does not repeat a concept", async () => {
    const deck = deckOf(["a", "b", "c"]);
    const mastery: Record<string, MasteryRecord> = {};
    const calls: string[] = [];
    const runner = createSessionRunner({
      deck,
      getMastery: () => mastery,
      putMastery: (next) => {
        mastery[next.conceptId] = next;
      },
      fetchQuestion: async (request: QuestionRequest) => {
        calls.push(`${request.concept.id}:${request.level}`);
        await Promise.resolve();
        return envelopeFromFixture(request);
      },
      now: () => 1_000,
    });

    await runner.start();
    expect(calls).toEqual(["a:1", "b:1"]);
    expect(runner.getSnapshot().current?.concept.id).toBe("a");

    runner.submit({ correct: true, score: 1 });
    await whenIdle(runner);

    expect(runner.getSnapshot().current?.concept.id).toBe("b");
    expect(runner.getSnapshot().current?.concept.id).not.toBe("a");
    expect(calls.filter((call) => call.startsWith("b:"))).toHaveLength(1);
    expect(calls).toEqual(["a:1", "b:1", "c:1"]);
    expect(runner.getSnapshot().progress.answered).toBe(1);
    expect(mastery.a?.level).toBe(2);
    runner.dispose();
  });

  it("falls back to a local type-the-answer card when the question request fails", async () => {
    const deck = deckOf(["a", "b"]);
    const runner = createSessionRunner({
      deck,
      getMastery: () => ({}),
      putMastery: () => {},
      fetchQuestion: async () => {
        throw new Error("api down");
      },
      now: () => 0,
    });
    await runner.start();
    expect(runner.getSnapshot().current?.envelope.spec.widget).toBe("typeAnswer");
    expect(runner.getSnapshot().isLoading).toBe(false);
    runner.dispose();
  });
});
