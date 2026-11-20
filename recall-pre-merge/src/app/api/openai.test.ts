import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as extract } from "./extract/route";
import { POST as question } from "./question/route";

const reading = "A hold request reserves a book for pickup at the selected branch.";
const concept = { id: "hold", term: "Hold request", definition: reading, facts: [reading], related: [] };

function post(route: string, data: unknown) {
  return new Request(`http://localhost/api/${route}`, { method: "POST", body: JSON.stringify(data) });
}

function modelResult(data: unknown) {
  return Response.json({ status: "completed", output: [
    { type: "reasoning" },
    { type: "message", content: [{ type: "output_text", text: JSON.stringify(data) }] },
  ] });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional OpenAI study routes", () => {
  it("uses local text and skips external requests without a configured key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const call = vi.fn();
    vi.stubGlobal("fetch", call);
    const response = await extract(post("extract", { text: reading }));
    expect(response.headers.get("x-recall-mode")).toBe("local");
    expect((await response.json()).deck.concepts[0].facts).toEqual([reading]);
    expect(call).not.toHaveBeenCalled();
  });

  it("uses the OpenAI Responses schema and attaches literal supporting evidence", async () => {
    vi.stubEnv("OPENAI_API_KEY", "mock-token");
    const call = vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      expect(payload.model).toBe("gpt-5-mini");
      expect(payload.store).toBe(false);
      expect(payload.text.format.type).toBe("json_schema");
      expect(payload.text.format.strict).toBe(true);
      return modelResult({ concepts: [{ term: "Library hold", definition: "Reserves a library book.", passage: 0 }] });
    });
    vi.stubGlobal("fetch", call);
    const response = await extract(post("extract", { text: reading, title: "Readings" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-recall-mode")).toBe("ai");
    expect((await response.json()).deck.concepts[0]).toMatchObject({ term: "Library hold", facts: [reading] });
    expect(call).toHaveBeenCalledOnce();
    expect(call.mock.calls[0][0]).toBe("https://api.openai.com/v1/responses");
  });

  it("uses a valid model widget and falls back when its answer cannot be graded", async () => {
    vi.stubEnv("OPENAI_API_KEY", "mock-token");
    const call = vi.fn()
      .mockResolvedValueOnce(modelResult({ spec: { widget: "trueFalse", props: {
        statement: "A hold request reserves a book for pickup.", answer: true, explanation: reading,
      } } }))
      .mockResolvedValueOnce(modelResult({ spec: { widget: "multipleChoice", props: {
        prompt: "Which term?", options: ["Hold request", "Renewal", "Checkout"], correctIndex: 9, explanation: reading,
      } } }));
    vi.stubGlobal("fetch", call);
    const request = { concept, neighbors: [], level: 1, recentWidgets: [] };
    const accepted = await question(post("question", request));
    expect(accepted.headers.get("x-recall-mode")).toBe("ai");
    expect(await accepted.json()).toMatchObject({ conceptIds: [concept.id], spec: { widget: "trueFalse" } });
    const payload = JSON.parse(String(call.mock.calls[0][1].body));
    expect(payload.text.format.type).toBe("json_object");
    expect(payload.input[0].content).toContain("Return a JSON object matching this schema");
    const recovered = await question(post("question", request));
    expect(recovered.headers.get("x-recall-mode")).toBe("local");
    expect(await recovered.json()).toMatchObject({ conceptIds: [concept.id], spec: { widget: "typeAnswer" } });
  });
});
