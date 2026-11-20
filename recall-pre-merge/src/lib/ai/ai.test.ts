import { POST as extract } from "@/app/api/extract/route";
import { POST as grade } from "@/app/api/grade/route";
import { POST as question } from "@/app/api/question/route";
import { questionBank, specsForWidget } from "@/fixtures/bank";
import { introCsDeck } from "@/fixtures/intro-cs";
import { sampleDeck } from "@/fixtures/cell-biology";
import { extractDeck, fetchQuestion, gradeAnswer, StudyClientError } from "@/lib/aiClient";
import {
  AnswerResultSchema,
  Deck,
  ExtractResponse,
  QuestionEnvelopeSchema,
  WidgetSpec,
  type QuestionRequest,
} from "@/lib/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { widgetIssues } from "./checks";
import { assignConceptIds, groundedFacts } from "./concepts";
import { AIError } from "./errors";
import { buildLocalQuestion } from "@/lib/localPractice";
import { callJSON } from "./claude";
import { extractSystemPrompt, gradeSystemPrompt, questionSystemPrompt } from "./prompts";
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

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("DEMO_MODE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function completion(content: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(content) }],
      stop_reason: "end_turn",
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function questionBody(patch: Partial<QuestionRequest> = {}): QuestionRequest {
  return {
    concept: sampleDeck.concepts[0],
    neighbors: sampleDeck.concepts.slice(1, 4),
    level: 1,
    recentWidgets: [],
    ...patch,
  };
}

const biologyNotes = [
  "Mitochondria produce ATP in the matrix.",
  "Chloroplasts fix carbon in the stroma.",
  "Ribosomes translate mRNA into protein.",
  "The nucleus stores DNA as chromosomes.",
  "Enzymes lower the activation energy of a reaction.",
].join(" ");

function extractedDeck() {
  return {
    title: "Cells",
    concepts: [
      {
        term: "Mitochondrion",
        definition: "An organelle that produces ATP.",
        facts: ["Mitochondria produce ATP in the matrix.", "Invented fact about quantum pores"],
        related: ["Chloroplast"],
      },
      {
        term: "Chloroplast",
        definition: "An organelle that fixes carbon.",
        facts: ["Chloroplasts fix carbon in the stroma."],
        related: ["Mitochondrion"],
      },
      {
        term: "Ribosome",
        definition: "A machine that translates mRNA into protein.",
        facts: [],
        related: [],
      },
      {
        term: "Nucleus",
        definition: "The compartment that stores DNA.",
        facts: ["The nucleus stores DNA as chromosomes."],
        related: [],
      },
      {
        term: "Enzyme",
        definition: "A catalyst that lowers activation energy.",
        facts: ["Enzymes lower the activation energy of a reaction."],
        related: [],
      },
    ],
  };
}

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

describe("concept ids and grounding", () => {
  it("assigns slug-plus-index ids and maps related terms", () => {
    const concepts = assignConceptIds([
      { term: "Mitochondrion", definition: "Makes ATP in cells today.", facts: ["one"], related: ["Chloroplast"] },
      { term: "Chloroplast", definition: "Fixes carbon in plants.", related: ["Mitochondrion"] },
    ]);
    expect(concepts.map((concept) => concept.id)).toEqual(["mitochondrion-1", "chloroplast-2"]);
    expect(concepts[0].related).toEqual(["chloroplast-2"]);
    expect(concepts[1].related).toEqual(["mitochondrion-1"]);
  });

  it("drops facts that are not in the source", () => {
    const source = "Mitochondria produce ATP in the matrix.";
    expect(groundedFacts(["Mitochondria produce ATP in the matrix.", "They emit purple light"], source)).toEqual([
      "Mitochondria produce ATP in the matrix.",
    ]);
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

describe("prompts", () => {
  it("states the registry, the no-invention rule, and spelling tolerance", () => {
    const question = questionSystemPrompt();
    for (const name of widgetNames) expect(question).toContain(name);
    expect(question).toMatch(/all of the above/i);
    expect(extractSystemPrompt()).toMatch(/Never invent facts/);
    expect(gradeSystemPrompt()).toMatch(/Do not penalize spelling/);
  });
});

describe("callJSON", () => {
  const okSchema = z.object({ ok: z.literal(true) });

  it("retries once with the validation error, then returns the corrected JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion({ ok: false }))
      .mockResolvedValueOnce(completion({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const value = await callJSON("Be brief.", "Answer.", okSchema, { apiKey: "test-key", timeoutMs: 1000 });
    expect(value).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)) as {
      messages: { content: string }[];
      output_config: { format: { type: string } };
    };
    expect(second.messages[0].content).toMatch(/failed validation/);
    expect(second.messages[0].content).toMatch(/ok/);
    expect(second.output_config.format.type).toBe("json_schema");
    const firstHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as { "x-api-key": string };
    expect(firstHeaders["x-api-key"]).toBe("test-key");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it("throws a typed timeout error after one retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      }),
    );

    await expect(callJSON("system", "user", okSchema, { apiKey: "test-key", timeoutMs: 20 })).rejects.toMatchObject({
      name: "AIError",
      code: "timeout",
    });
  });

  it("throws missing_key without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(callJSON("system", "user", okSchema, { apiKey: "  " })).rejects.toBeInstanceOf(AIError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/extract", () => {
  it("parses a Quizlet export without a model call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await extract(
      jsonRequest("http://localhost/api/extract", {
        text: "Mitochondrion\tProduces ATP\nChloroplast - Fixes carbon\nRibosome\tTranslates mRNA",
        title: "Cards",
      }),
    );
    expect(response.status).toBe(200);
    const body = ExtractResponse.parse(await response.json());
    expect(body.deck.title).toBe("Cards");
    expect(body.deck.concepts.map((concept) => concept.term)).toEqual(["Mitochondrion", "Chloroplast", "Ribosome"]);
    expect(body.deck.concepts[0].id).toBe("mitochondrion-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the notes exceed 20,000 characters", async () => {
    const response = await extract(
      jsonRequest("http://localhost/api/extract", { text: "a".repeat(20_001) }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/20,000/);
  });

  it("serves the sample deck in DEMO_MODE=fixtures even if a key is present", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("DEMO_MODE", "fixtures");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await extract(
      jsonRequest("http://localhost/api/extract", {
        text: "Mitochondrion\tProduces ATP\nChloroplast - Fixes carbon",
        title: "Night before bio",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-recall-mode")).toBe("local");
    const body = ExtractResponse.parse(await response.json());
    expect(body.deck.title).toBe("Night before bio");
    expect(body.deck.id).not.toBe(sampleDeck.id);
    expect(body.deck.concepts.map((concept) => concept.term)).toEqual(["Mitochondrion", "Chloroplast"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps grounded facts and stable ids from the model", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion(extractedDeck())));
    const response = await extract(jsonRequest("http://localhost/api/extract", { text: biologyNotes, title: "Bio" }));
    expect(response.status).toBe(200);
    const body = ExtractResponse.parse(await response.json());
    expect(body.deck.title).toBe("Bio");
    expect(body.deck.concepts[0].id).toBe("mitochondrion-1");
    expect(body.deck.concepts[0].facts).toEqual(["Mitochondria produce ATP in the matrix."]);
    expect(body.deck.concepts[0].related).toEqual(["chloroplast-2"]);
  });
});

describe("POST /api/question", () => {
  const trueFalse = {
    spec: {
      widget: "trueFalse",
      props: {
        statement: "Mitochondria produce most of a eukaryotic cell's ATP.",
        answer: true,
        explanation: "The Krebs cycle and the electron transport chain run in the mitochondrion.",
      },
    },
  };

  it("asks the model again when the first widget fails the server checks", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        completion({
          spec: {
            widget: "multipleChoice",
            props: {
              prompt: "Pick one.",
              options: ["Same answer", "Same answer", "Different"],
              correctIndex: 0,
              explanation: "No.",
            },
          },
        }),
      )
      .mockResolvedValueOnce(completion(trueFalse));
    vi.stubGlobal("fetch", fetchMock);

    const response = await question(jsonRequest("http://localhost/api/question", questionBody()));
    expect(response.status).toBe(200);
    const body = QuestionEnvelopeSchema.parse(await response.json());
    expect(body.spec.widget).toBe("trueFalse");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retry = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as { messages: { content: string }[] };
    expect(retry.messages[0].content).toMatch(/failed validation/);
  });

  it("falls back to a typeAnswer and never returns 500 when the model is down", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket closed")));
    const concept = {
      id: "not-in-the-bank",
      term: "Cristae",
      definition: "Folds of the mitochondrial inner membrane.",
      facts: [],
      related: [],
    };
    const response = await question(
      jsonRequest("http://localhost/api/question", questionBody({ concept, neighbors: [], level: 2 })),
    );
    expect(response.status).toBe(200);
    const body = QuestionEnvelopeSchema.parse(await response.json());
    const request = questionBody({ concept, neighbors: [], level: 2 });
    expect(body.spec).toEqual(buildLocalQuestion(request).spec);
    expect(body.conceptIds).toEqual(["not-in-the-bank"]);
  });

  it("uses a matching sample-deck fixture when the model returns nothing usable", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion({ spec: { widget: "nope" } })));
    const response = await question(jsonRequest("http://localhost/api/question", questionBody()));
    expect(response.status).toBe(200);
    const body = QuestionEnvelopeSchema.parse(await response.json());
    expect(body.spec.widget).toBe("multipleChoice");
    expect(body.conceptIds).toEqual([sampleDeck.concepts[0].id]);
  });
});

describe("POST /api/grade", () => {
  const gradeBody = {
    concept: sampleDeck.concepts[9],
    prompt: "Explain how an enzyme speeds up a reaction.",
    rubric: ["It lowers the activation energy of the reaction", "The substrate binds at the active site"],
    answer: "It lowers the barrier so the reaction can proceed.",
  };

  it("passes at 0.7 and keeps one sentence of feedback", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion({
          score: 0.7,
          feedback: "You explained the energy barrier. Add where the substrate binds.",
          missing: ["The substrate binds at the active site"],
        }),
      ),
    );
    const response = await grade(jsonRequest("http://localhost/api/grade", gradeBody));
    expect(response.status).toBe(200);
    const body = AnswerResultSchema.parse(await response.json());
    expect(body.correct).toBe(true);
    expect(body.score).toBe(0.7);
    expect(body.feedback).toBe("You explained the energy barrier.");
    expect(body.missing).toEqual(["The substrate binds at the active site"]);
  });

  it("rejects an answer over 2,000 characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await grade(
      jsonRequest("http://localhost/api/grade", { ...gradeBody, answer: "a".repeat(2_001) }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/2,000/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the keyword grader when the model call throws", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("DEMO_MODE", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const response = await grade(
      jsonRequest("http://localhost/api/grade", {
        ...gradeBody,
        answer: "It lowers the activation energy so the reaction happens faster.",
      }),
    );
    expect(response.status).toBe(200);
    const body = AnswerResultSchema.parse(await response.json());
    expect(body.score).toBe(0.5);
    expect(body.correct).toBe(false);
    expect(body.missing).toEqual(["The substrate binds at the active site"]);
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

  it("keeps every bank spec inside the server checks for its level", () => {
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

describe("aiClient", () => {
  it("posts extractDeck(text, title) and validates the deck", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ deck: sampleDeck }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractDeck("notes", "Title");
    expect(result.deck.title).toBe(sampleDeck.title);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ text: "notes", title: "Title" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/extract");
  });

  it("retries a 500 once and surfaces a friendly 400", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "nope" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deck: sampleDeck }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(extractDeck("notes")).resolves.toMatchObject({ deck: { id: sampleDeck.id } });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Paste some notes first." }), { status: 400 })),
    );
    await expect(fetchQuestion(questionBody())).rejects.toMatchObject({
      name: "StudyClientError",
      message: "Paste some notes first.",
      status: 400,
    });
  });

  it("validates a grade response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ correct: true, score: 1, feedback: "Nice." }), { status: 200 }),
      ),
    );
    const result = await gradeAnswer({
      concept: sampleDeck.concepts[0],
      prompt: "Why?",
      rubric: ["Because"],
      answer: "Because",
    });
    expect(result.correct).toBe(true);
  });

  it("rejects an unusable payload after one retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ nope: true }), { status: 200 })));
    await expect(extractDeck("notes")).rejects.toBeInstanceOf(StudyClientError);
  });
});
