import { envelopeFromFixture } from "@/fixtures";
import { QuestionEnvelopeSchema, QuestionRequest } from "@/lib/schema";

/** Stub: returns a fixture widget for the requested level. Agent 3 replaces this. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = QuestionRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const envelope = QuestionEnvelopeSchema.parse(envelopeFromFixture(parsed.data));
  return Response.json(envelope);
}
