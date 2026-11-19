import { sampleDeck } from "@/fixtures";
import { ExtractRequest, ExtractResponse } from "@/lib/schema";

/** Stub: returns the sample deck. Agent 3 replaces this with extraction. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = parsed.data.title?.trim();
  const deck = {
    ...sampleDeck,
    title: title ? title : sampleDeck.title,
    concepts: sampleDeck.concepts.map((concept) => ({
      ...concept,
      facts: [...concept.facts],
      related: [...concept.related],
    })),
  };
  const payload = { deck } satisfies ExtractResponse;
  return Response.json(payload);
}
