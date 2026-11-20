import { generateQuestion, localTypeAnswer } from "@/lib/ai/question";
import { jsonError, logRoute, readJson } from "@/lib/ai/route-log";
import { buildLocalQuestion } from "@/lib/localPractice";
import { QuestionEnvelopeSchema, QuestionRequest, type QuestionRequest as QuestionRequestBody } from "@/lib/schema";
import { openAiQuestion } from "../openai";

function emergencyEnvelope(body: QuestionRequestBody) {
  try {
    return QuestionEnvelopeSchema.parse(buildLocalQuestion(body));
  } catch {
    return QuestionEnvelopeSchema.parse(localTypeAnswer(body));
  }
}

/**
 * Generative UI. The model picks a widget, zod and the server checks reject a bad one,
 * and the route still returns a playable question if the model is down.
 */
export async function POST(request: Request) {
  const started = Date.now();
  let parsedBody: QuestionRequestBody | null = null;
  try {
    const body = await readJson(request);
    if (body === undefined) return jsonError(400, "Invalid JSON");

    const parsed = QuestionRequest.safeParse(body);
    if (!parsed.success) return jsonError(400, "Invalid request");
    parsedBody = parsed.data;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
    const openAiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
    const demoFixtures = process.env.DEMO_MODE === "fixtures";
    if (!demoFixtures && !apiKey && openAiKey) {
      const local = buildLocalQuestion(parsed.data);
      const generated = await openAiQuestion(parsed.data, local);
      const envelope = QuestionEnvelopeSchema.parse(generated ?? local);
      logRoute("POST /api/question", started, generated ? "openai" : "local");
      return Response.json(envelope, {
        headers: { "Cache-Control": "no-store", "X-Recall-Mode": generated ? "ai" : "local" },
      });
    }

    const generated = await generateQuestion(parsed.data, { apiKey, demoFixtures });
    logRoute("POST /api/question", started, generated.source);
    const mode = generated.source === "model" ? "ai" : "local";
    return Response.json(generated.envelope, {
      headers: { "Cache-Control": "no-store", "X-Recall-Mode": mode },
    });
  } catch (error) {
    console.info("[recall] POST /api/question failed", error instanceof Error ? error.message : error);
    if (!parsedBody) return jsonError(400, "Invalid request");
    logRoute("POST /api/question", started, "emergency-fallback");
    return Response.json(emergencyEnvelope(parsedBody), {
      headers: { "Cache-Control": "no-store", "X-Recall-Mode": "local" },
    });
  }
}
