import { buildLocalDeck, MAX_SOURCE_LENGTH } from "@/lib/localPractice";
import { ExtractRequest, ExtractResponse } from "@/lib/schema";
import { grokDeck } from "../grok";
import { invalidJson, readJson } from "../readJson";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, MAX_SOURCE_LENGTH * 6 + 4_096);
  } catch (error) {
    return invalidJson(error);
  }

  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { text, title } = parsed.data;
  if (!text.trim()) return Response.json({ error: "Add some source text before generating practice" }, { status: 400 });
  if (text.length > MAX_SOURCE_LENGTH) {
    return Response.json({ error: `Source text must be ${MAX_SOURCE_LENGTH.toLocaleString("en-US")} characters or fewer` }, { status: 413 });
  }

  const local = buildLocalDeck(text, title);
  if (!local.concepts.length) return Response.json({ error: "Add a sentence or note to generate practice" }, { status: 400 });
  const generated = await grokDeck(local);
  return Response.json(ExtractResponse.parse({ deck: generated ?? local }), {
    headers: { "Cache-Control": "no-store", "X-Recall-Mode": generated ? "ai" : "local" },
  });
}
