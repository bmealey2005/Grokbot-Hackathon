import { buildLocalQuestion } from "@/lib/localPractice";
import { QuestionEnvelopeSchema, QuestionRequest } from "@/lib/schema";
import { grokQuestion } from "../grok";
import { invalidJson, readJson } from "../readJson";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 260_000);
  } catch (error) {
    return invalidJson(error);
  }

  const parsed = QuestionRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!parsed.data.concept.term.trim() || !parsed.data.concept.definition.trim()) {
    return Response.json({ error: "A concept needs a term and definition" }, { status: 400 });
  }

  const local = buildLocalQuestion(parsed.data);
  const generated = await grokQuestion(parsed.data, local);
  return Response.json(QuestionEnvelopeSchema.parse(generated ?? local), {
    headers: { "Cache-Control": "no-store", "X-Recall-Mode": generated ? "ai" : "local" },
  });
}
