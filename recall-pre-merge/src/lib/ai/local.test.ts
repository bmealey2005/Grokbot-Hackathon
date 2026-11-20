import { questionBank, specsForWidget } from "@/fixtures/bank";
import { introCsDeck } from "@/fixtures/intro-cs";
import { sampleDeck } from "@/fixtures/cell-biology";
import { Deck, WidgetSpec } from "@/lib/schema";
import { extractDeck, fetchQuestion, gradeAnswer } from "@/lib/studyClient";
import { describe, expect, it, vi } from "vitest";
import { widgetIssues } from "./checks";
import { assignConceptIds } from "./concepts";
import { parseQuizlet } from "./quizlet";

const widgetNames = [
  "multipleChoice",
  "trueFalse",
  "cloze",
  "typeAnswer",
  "matchPairs",
  "orderSteps",
  "slider",
  "explain",
] as const;

describe("quizlet fast path", () => {
  it("parses tab and dash rows when they are most of the lines", () => {
    const pairs = parseQuizlet("ATP\tenergy currency\nOsmosis - water moves toward solute\nnote\n");
    expect(pairs).toEqual([
      { term: "ATP", definition: "energy currency" },
      { term: "Osmosis", definition: "water moves toward solute" },
    ]);
  });

  it("rejects prose that only contains one dashed line", () => {
    const text = ["Cells contain many organelles.", "ATP - energy is useful.", "Membranes regulate traffic."].join(
      "\n",
    );
    expect(parseQuizlet(text)).toBeNull();
  });
});

describe("concept ids", () => {
  it("assigns slug-plus-index ids and maps related terms", () => {
    const concepts = assignConceptIds([
      { term: "Mitochondrion", definition: "Makes ATP in cells today.", facts: ["one"], related: ["Chloroplast"] },
      { term: "Chloroplast", definition: "Fixes carbon in plants.", related: ["Mitochondrion"] },
    ]);
    expect(concepts.map((concept) => concept.id)).toEqual(["mitochondrion-1", "chloroplast-2"]);
    expect(concepts[0].related).toEqual(["chloroplast-2"]);
    expect(concepts[1].related).toEqual(["mitochondrion-1"]);
  });
});

describe("widget checks", () => {
  it("rejects a bad index, duplicate options, a cloze mismatch, and a slider outside the range", () => {
    expect(
      widgetIssues(
        {
          widget: "multipleChoice",
          props: {
            prompt: "Which organelle?",
            options: ["Same", "Same", "Other"],
            correctIndex: 9,
            explanation: "Because.",
          },
        },
        { level: 1, recentWidgets: [] },
      ).length,
    ).toBeGreaterThan(0);

    expect(
      widgetIssues(
        {
          widget: "cloze",
          props: { text: "Adenine pairs with {{blank}}.", answers: [["thymine"], ["cytosine"]], explanation: "Bases." },
        },
        { level: 2, recentWidgets: [] },
      ).join(" "),
    ).toMatch(/answers.length/);

    expect(
      widgetIssues(
        {
          widget: "slider",
          props: { prompt: "How many?", min: 0, max: 10, answer: 12, tolerance: 0, explanation: "Nope." },
        },
        { level: 3, recentWidgets: [] },
      ).join(" "),
    ).toMatch(/within/);
  });

  it("rejects a recently used widget when another format fits", () => {
    const issues = widgetIssues(
      {
        widget: "multipleChoice",
        props: {
          prompt: "Which one?",
          options: ["Alpha", "Beta", "Gamma"],
          correctIndex: 1,
          explanation: "Beta.",
        },
      },
      { level: 1, recentWidgets: ["multipleChoice"] },
    );
    expect(issues.join(" ")).toMatch(/trueFalse/);
  });
});

describe("fixtures for the offline demo", () => {
  it("has two or three valid specs for every widget", () => {
    for (const name of widgetNames) {
      const specs = specsForWidget(name);
      expect(specs.length).toBeGreaterThanOrEqual(2);
      expect(specs.length).toBeLessThanOrEqual(3);
      for (const spec of specs) {
        expect(WidgetSpec.parse(spec).widget).toBe(name);
      }
    }
  });

  it("keeps every bank spec inside the widget checks for its level", () => {
    for (const item of questionBank) {
      const issues = widgetIssues(item.spec, { level: item.levels[0], recentWidgets: [] });
      expect(issues, `${item.conceptId} ${item.spec.widget}`).toEqual([]);
    }
  });

  it("validates the Intro CS deck", () => {
    const deck = Deck.parse(introCsDeck);
    expect(deck.title).toBe("Intro CS: Big-O");
    expect(deck.concepts.length).toBeGreaterThanOrEqual(8);
    const ids = deck.concepts.map((concept) => concept.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const concept of deck.concepts) {
      expect(concept.facts.length).toBeGreaterThan(0);
      for (const relatedId of concept.related) {
        expect(ids).toContain(relatedId);
        expect(relatedId).not.toBe(concept.id);
      }
    }
  });
});

describe("study client", () => {
  it("imports, generates a question, and grades without sending study text over the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected request"));
    try {
      const { deck } = await extractDeck({ title: "Private reading", text: "Hold\tReserves a book\nRenewal - Extends a loan" });
      const [concept, ...neighbors] = deck.concepts;
      expect(concept.term).toBe("Hold");
      expect(deck.id).toMatch(/^reading-[0-9a-f-]+$/);
      const question = await fetchQuestion({ concept, neighbors, level: 1, recentWidgets: [] });
      expect(question.conceptIds).toContain(concept.id);
      const grade = await gradeAnswer({ concept, prompt: "Why place a hold?", rubric: ["Reserves a book"], answer: "Reserves a book" });
      expect(grade.correct).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rejects notes and answers past their existing limits", async () => {
    await expect(extractDeck({ text: "x".repeat(20_001) })).rejects.toThrow(/20,000/);
    await expect(gradeAnswer({
      concept: sampleDeck.concepts[0],
      prompt: "Explain the concept.",
      rubric: ["key idea"],
      answer: "x".repeat(2_001),
    })).rejects.toThrow(/2,000/);
  });
});
