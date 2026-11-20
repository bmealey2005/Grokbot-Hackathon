import { POST as extract } from "@/app/api/extract/route";
import { POST as grade } from "@/app/api/grade/route";
import { POST as question } from "@/app/api/question/route";
import {
  AnswerResultSchema,
  Deck,
  ExtractResponse,
  QuestionEnvelopeSchema,
  WidgetSpec,
} from "@/lib/schema";
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

describe("study API", () => {
  it("POST /api/extract returns a new deck grounded in the submitted text", async () => {
    const text = "A hold request lets a reader choose a library branch for pickup.";
    const response = await extract(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({ text, title: "Library holds" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-recall-mode")).toBe("local");
    const body = ExtractResponse.parse(await response.json());
    expect(body.deck.title).toBe("Library holds");
    expect(body.deck.id).not.toBe(sampleDeck.id);
    expect(body.deck.concepts).toHaveLength(1);
    expect(body.deck.concepts[0].facts).toEqual([text]);
  });

  it("uses an explicitly numbered reading as an ordering question", async () => {
    const text = "1. Request\nChoose a pickup branch.\n2. Notify\nWait for a message.\n3. Collect\nCheck out the book.";
    const imported = await extract(new Request("http://localhost/api/extract", {
      method: "POST",
      body: JSON.stringify({ text }),
    }));
    const { deck } = ExtractResponse.parse(await imported.json());
    const [concept, ...neighbors] = deck.concepts;
    const response = await question(new Request("http://localhost/api/question", {
      method: "POST",
      body: JSON.stringify({ concept, neighbors, level: 3, recentWidgets: [] }),
    }));
    const { spec } = QuestionEnvelopeSchema.parse(await response.json());
    expect(spec.widget).toBe("orderSteps");
    if (spec.widget === "orderSteps") expect(spec.props.steps).toEqual(["Request", "Notify", "Collect"]);
  });

  it("POST /api/extract rejects a bad body", async () => {
    const response = await extract(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({ title: "missing text" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("POST /api/question avoids a recently used widget", async () => {
    const concept = sampleDeck.concepts[0];
    const response = await question(
      new Request("http://localhost/api/question", {
        method: "POST",
        body: JSON.stringify({
          concept,
          neighbors: [],
          level: 1,
          recentWidgets: ["multipleChoice"],
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = QuestionEnvelopeSchema.parse(await response.json());
    expect(body.spec.widget).toBe("trueFalse");
    expect(body.level).toBe(1);
    expect(body.conceptIds).toEqual([concept.id]);
  });

  it("keeps seeded questions aligned with the selected concept", async () => {
    const concept = sampleDeck.concepts.find(({ id }) => id === "chloroplast")!;
    const response = await question(new Request("http://localhost/api/question", {
      method: "POST",
      body: JSON.stringify({ concept, neighbors: [], level: 1, recentWidgets: ["multipleChoice"] }),
    }));
    const { conceptIds, spec } = QuestionEnvelopeSchema.parse(await response.json());
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
    };
    const response = await question(new Request("http://localhost/api/question", {
      method: "POST",
      body: JSON.stringify({ concept, neighbors: [], level: 1, recentWidgets: [] }),
    }));
    const { spec } = QuestionEnvelopeSchema.parse(await response.json());
    expect(spec.widget).toBe("typeAnswer");
    if (spec.widget === "typeAnswer") {
      expect(spec.props.prompt).toContain("A visitor ____ an unreserved headset.");
      expect(spec.props.accepted).toEqual(["Reserve"]);
    }
  });

  it("POST /api/grade scores a free-text answer against the rubric", async () => {
    const response = await grade(
      new Request("http://localhost/api/grade", {
        method: "POST",
        body: JSON.stringify({
          concept: sampleDeck.concepts[0],
          prompt: "Explain how an enzyme speeds up a reaction.",
          rubric: [
            "It lowers the activation energy of the reaction",
            "The substrate binds at the active site",
          ],
          answer: "It lowers the activation energy so the reaction happens faster.",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = AnswerResultSchema.parse(await response.json());
    expect(body.score).toBe(0.5);
    expect(body.correct).toBe(false);
    expect(body.missing).toEqual(["The substrate binds at the active site"]);
  });
});
