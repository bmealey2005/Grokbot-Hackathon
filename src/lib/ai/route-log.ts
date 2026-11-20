export function logRoute(route: string, startedMs: number, source: string): void {
  console.info(`[recall] ${route} ${Date.now() - startedMs}ms source=${source}`);
}

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
