import { ANSWER_CHAR_LIMIT, ANSWER_TOO_LONG } from "@/lib/ai/config";
import { gradeSubmittedAnswer, heuristicGrade } from "@/lib/ai/grade";
import { jsonError, logRoute, readJson } from "@/lib/ai/route-log";
import { GradeRequest } from "@/lib/schema";

/** Rubric grading. Paraphrases count. A model failure falls back to the keyword grader. */
export async function POST(request: Request) {
  const started = Date.now();
  const body = await readJson(request);
  if (body === undefined) return jsonError(400, "Invalid JSON");

  const parsed = GradeRequest.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request");
  if (parsed.data.answer.length > ANSWER_CHAR_LIMIT) return jsonError(400, ANSWER_TOO_LONG);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const demoFixtures = process.env.DEMO_MODE === "fixtures";
  try {
    const graded = await gradeSubmittedAnswer(parsed.data, { apiKey, demoFixtures });
    logRoute("POST /api/grade", started, graded.source);
    return Response.json(graded.result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.info("[recall] POST /api/grade failed", error instanceof Error ? error.message : error);
    logRoute("POST /api/grade", started, "heuristic-fallback");
    return Response.json(heuristicGrade(parsed.data), { headers: { "Cache-Control": "no-store" } });
  }
}
