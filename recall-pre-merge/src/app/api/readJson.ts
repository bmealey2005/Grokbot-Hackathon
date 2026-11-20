/** Apply the cap while reading so oversized bodies cannot accumulate in memory. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let count = 0;
  let text = "";

  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maxBytes) {
        await reader.cancel();
        throw tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
  }

  return JSON.parse(text + decoder.decode()) as unknown;
}

function tooLarge() {
  return new RangeError("Request body is too large");
}

export function invalidJson(error: unknown): Response {
  return error instanceof RangeError
    ? Response.json({ error: "Request body is too large" }, { status: 413 })
    : Response.json({ error: "Invalid JSON" }, { status: 400 });
}
