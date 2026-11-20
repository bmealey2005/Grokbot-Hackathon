import { EMPTY_NOTES, NOTES_CHAR_LIMIT, NOTES_TOO_LONG } from "@/lib/ai/config";
import { extractDeckFromNotes } from "@/lib/ai/extract";
import { jsonError, logRoute, readJson } from "@/lib/ai/route-log";
import { buildLocalDeck } from "@/lib/localPractice";
import { ExtractRequest, ExtractResponse } from "@/lib/schema";
import { openAiDeck } from "../openai";

/** Notes in, deck out. Quizlet exports and local readings skip the model. */
export async function POST(request: Request) {
  const started = Date.now();
  const body = await readJson(request);
  if (body === undefined) return jsonError(400, "Invalid JSON");

  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request");
  if (!parsed.data.text.trim()) return jsonError(400, EMPTY_NOTES);
  if (parsed.data.text.length > NOTES_CHAR_LIMIT) return jsonError(400, NOTES_TOO_LONG);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const openAiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const demoFixtures = process.env.DEMO_MODE === "fixtures";
  try {
    if (!demoFixtures && !apiKey && openAiKey) {
      const local = buildLocalDeck(parsed.data.text, parsed.data.title);
      if (!local.concepts.length) return jsonError(400, "Add a sentence or note to generate practice");
      const generated = await openAiDeck(local);
      logRoute("POST /api/extract", started, generated ? "openai" : "local");
      return Response.json(ExtractResponse.parse({ deck: generated ?? local }), {
        headers: { "Cache-Control": "no-store", "X-Recall-Mode": generated ? "ai" : "local" },
      });
    }

    const extraction = await extractDeckFromNotes(parsed.data, { apiKey, demoFixtures });
    logRoute("POST /api/extract", started, extraction.source);
    const mode = extraction.source === "model" ? "ai" : "local";
    return Response.json(ExtractResponse.parse({ deck: extraction.deck }), {
      headers: { "Cache-Control": "no-store", "X-Recall-Mode": mode },
    });
  } catch (error) {
    console.info("[recall] POST /api/extract failed", error instanceof Error ? error.message : error);
    logRoute("POST /api/extract", started, "error");
    return jsonError(400, "Those notes couldn't be turned into a deck. Try a shorter excerpt.");
  }
}
