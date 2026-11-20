import { describe, expect, it } from "vitest";
import { matchesAccepted, normalizeAnswer, pairwiseOrderScore, scoreBlanks, scoreSlider } from "./grade";

describe("fuzzy answers", () => {
  it("ignores case, whitespace, accents, and edge punctuation", () => {
    expect(normalizeAnswer("  Osmósis. ")).toBe("osmosis");
    expect(matchesAccepted("  OSMOSIS ", ["osmosis"])).toBe(true);
    expect(matchesAccepted("Osmósis", ["osmosis"])).toBe(true);
    expect(matchesAccepted("osmosis.", ["Osmosis"])).toBe(true);
  });

  it("allows one edit on answers of five or more letters", () => {
    expect(matchesAccepted("thymne", ["thymine"])).toBe(true);
    expect(matchesAccepted("oxmxsis", ["osmosis"])).toBe(false);
  });

  it("keeps short answers exact", () => {
    expect(matchesAccepted("t", ["T"])).toBe(true);
    expect(matchesAccepted("a", ["T"])).toBe(false);
    expect(matchesAccepted("bat", ["cat"])).toBe(false);
  });

  it("rejects an empty guess", () => {
    expect(matchesAccepted("   ", ["osmosis"])).toBe(false);
  });
});

describe("pairwise order", () => {
  const correct = ["a", "b", "c", "d"];

  it("scores an exact order as 1", () => {
    expect(pairwiseOrderScore(correct, ["a", "b", "c", "d"])).toBe(1);
  });

  it("scores a full reversal as 0", () => {
    expect(pairwiseOrderScore(correct, ["d", "c", "b", "a"])).toBe(0);
  });

  it("scores one adjacent swap as five of six pairs", () => {
    expect(pairwiseOrderScore(correct, ["a", "b", "d", "c"])).toBeCloseTo(5 / 6);
  });
});

describe("partial credit", () => {
  it("scores blanks as a fraction", () => {
    const graded = scoreBlanks(["thymine", "cito sine"], [["thymine"], ["cytosine"]]);
    expect(graded.hits).toEqual([true, false]);
    expect(graded.score).toBe(0.5);
    expect(graded.correct).toBe(false);
  });

  it("scores a slider inside tolerance, within twice tolerance, and outside", () => {
    expect(scoreSlider(30, 30, 2)).toEqual({ correct: true, score: 1 });
    expect(scoreSlider(28, 30, 2)).toEqual({ correct: true, score: 1 });
    expect(scoreSlider(26, 30, 2)).toEqual({ correct: false, score: 0.5 });
    expect(scoreSlider(10, 30, 2)).toEqual({ correct: false, score: 0 });
  });
});
