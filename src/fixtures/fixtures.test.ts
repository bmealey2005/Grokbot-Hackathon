import { Deck, WidgetSpec, type ExtractRequest } from "@/lib/schema";
import { extractDeck, fetchQuestion, gradeAnswer, StudyClientError } from "@/lib/studyClient";
import { describe, expect, it } from "vitest";
import { sampleDeck } from "./cell-biology";
import { widgetSpecs } from "./widgets";

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

describe("fixtures", () => {
  it("validates the Cell Biology Basics deck", () => {
    const deck = Deck.parse(sampleDeck);
    expect(deck.title).toBe("Cell Biology Basics");
    expect(deck.concepts).toHaveLength(12);
    const ids = deck.concepts.map((concept) => concept.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const concept of deck.concepts) {
      expect(concept.term.length).toBeGreaterThan(0);
      expect(concept.definition.length).toBeGreaterThan(0);
      expect(concept.facts.length).toBeGreaterThan(0);
      for (const relatedId of concept.related) {
        expect(ids).toContain(relatedId);
        expect(relatedId).not.toBe(concept.id);
      }
    }
  });

  it("validates one fixture spec for every widget", () => {
    expect(Object.keys(widgetSpecs).sort()).toEqual([...widgetNames].sort());
    for (const name of widgetNames) {
      const spec = WidgetSpec.parse(widgetSpecs[name]);
      expect(spec.widget).toBe(name);
    }
  });

  it("rejects a widget outside the registry", () => {
    const parsed = WidgetSpec.safeParse({
      widget: "diagram",
      props: { prompt: "Label this" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("local practice", () => {
  it("returns a new deck grounded in the submitted text", async () => {
    const text = "A hold request lets a reader choose a library branch for pickup.";
    const { deck } = await extractDeck({ text, title: "Library holds" });
    expect(deck.title).toBe("Library holds");
    expect(deck.id).not.toBe(sampleDeck.id);
    expect(deck.concepts).toHaveLength(1);
    expect(deck.concepts[0].facts).toEqual([text]);
  });

  it("uses an explicitly numbered reading as an ordering question", async () => {
    const text = "1. Request\nChoose a pickup branch.\n2. Notify\nWait for a message.\n3. Collect\nCheck out the book.";
    const { deck } = await extractDeck({ text });
    const [concept, ...neighbors] = deck.concepts;
    const { spec } = await fetchQuestion({ concept, neighbors, level: 3, recentWidgets: [] });
    expect(spec.widget).toBe("orderSteps");
    if (spec.widget === "orderSteps") expect(spec.props.steps).toEqual(["Request", "Notify", "Collect"]);
  });

  it("rejects input without notes", async () => {
    const malformed = { title: "missing text" } as ExtractRequest;
    await expect(extractDeck(malformed)).rejects.toThrow(StudyClientError);
  });

  it("avoids a recently used widget", async () => {
    const concept = sampleDeck.concepts[0];
    const result = await fetchQuestion({ concept, neighbors: [], level: 1, recentWidgets: ["multipleChoice"] });
    expect(result.spec.widget).toBe("trueFalse");
    expect(result.level).toBe(1);
    expect(result.conceptIds).toEqual([concept.id]);
  });

  it("keeps seeded questions aligned with the selected concept", async () => {
    const concept = sampleDeck.concepts.find(({ id }) => id === "chloroplast")!;
    const { conceptIds, spec } = await fetchQuestion({
      concept, neighbors: [], level: 1, recentWidgets: ["multipleChoice"],
    });
    expect(conceptIds).toEqual(["chloroplast"]);
    expect(spec.widget).toBe("trueFalse");
    if (spec.widget === "trueFalse") {
      expect(spec.props.statement).toContain(concept.term);
      expect(spec.props.explanation).toBe(concept.definition);
    }
  });

  it("masks a whole inflected answer and preserves unrelated words", async () => {
    const concept = {
      id: "imported-reserve",
      term: "Reserve",
      definition: "A visitor reserves an unreserved headset.",
      facts: [],
      related: [],
    };
    const { spec } = await fetchQuestion({ concept, neighbors: [], level: 1, recentWidgets: [] });
    expect(spec.widget).toBe("typeAnswer");
    if (spec.widget === "typeAnswer") {
      expect(spec.props.prompt).toContain("A visitor ____ an unreserved headset.");
      expect(spec.props.accepted).toEqual(["Reserve"]);
    }
  });

  it("scores a free-text answer against the rubric", async () => {
    const result = await gradeAnswer({
      concept: sampleDeck.concepts[0],
      prompt: "Explain how an enzyme speeds up a reaction.",
      rubric: [
        "It lowers the activation energy of the reaction",
        "The substrate binds at the active site",
      ],
      answer: "It lowers the activation energy so the reaction happens faster.",
    });
    expect(result.score).toBe(0.5);
    expect(result.correct).toBe(false);
    expect(result.missing).toEqual(["The substrate binds at the active site"]);
  });
});
