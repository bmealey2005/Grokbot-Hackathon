import { z, type ZodType } from "zod";
import { AI_TIMEOUT_MS, ANTHROPIC_MESSAGES_URL, ANTHROPIC_VERSION, CLAUDE_MODEL } from "./config";
import { AIError } from "./errors";

export interface CallJSONOptions {
  /** Server route passes this. Never read the key in browser code. */
  apiKey: string;
  temperature?: number;
  timeoutMs?: number;
  maxCompletionTokens?: number;
  schemaName?: string;
  model?: string;
}

const STRIPPED_SCHEMA_KEYS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
]);

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (STRIPPED_SCHEMA_KEYS.has(key)) continue;
    output[key] = sanitizeSchema(value);
  }
  if (output.type === "object" && output.additionalProperties === undefined) {
    output.additionalProperties = false;
  }
  return output;
}

function jsonSchemaFor(schema: ZodType): Record<string, unknown> | null {
  try {
    return sanitizeSchema(z.toJSONSchema(schema)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function httpDetail(status: number, payload: unknown, raw: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return `Claude request failed (${status}): ${error.trim()}`;
    }
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return `Claude request failed (${status}): ${message.trim()}`;
      }
    }
  }
  const snippet = raw.trim().slice(0, 300);
  return snippet ? `Claude request failed (${status}): ${snippet}` : `Claude request failed (${status}).`;
}

function messageContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const content = (payload as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      if ((part as { type?: unknown }).type !== "text") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function zodDetail(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Call Claude with JSON-schema structured output, validate with zod, and retry once.
 * The retry appends the validation error so the model can correct its own output.
 */
export async function callJSON<T>(
  system: string,
  user: string,
  zodSchema: ZodType<T>,
  opts: CallJSONOptions,
): Promise<T> {
  const apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    throw new AIError("missing_key", "ANTHROPIC_API_KEY is not set.");
  }

  const timeoutMs = opts.timeoutMs ?? AI_TIMEOUT_MS;
  const jsonSchema = jsonSchemaFor(zodSchema);
  let forcePlainJson = jsonSchema === null;
  let lastDetail = "The model response failed validation.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const userContent =
      attempt === 0
        ? user
        : `${user}\n\nThe previous response failed validation: ${lastDetail}\nReturn only corrected JSON that matches the schema.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: opts.model ?? CLAUDE_MODEL,
          max_tokens: opts.maxCompletionTokens ?? 4096,
          temperature: opts.temperature ?? 0.2,
          system,
          messages: [{ role: "user", content: userContent }],
          ...(forcePlainJson || !jsonSchema
            ? {}
            : { output_config: { format: { type: "json_schema", schema: jsonSchema } } }),
        }),
        signal: controller.signal,
      });

      const raw = await response.text();
      let payload: unknown = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const detail = httpDetail(response.status, payload, raw);
        if (response.status === 401 || response.status === 403) {
          throw new AIError("http", detail, { status: response.status });
        }
        const schemaRejected = response.status === 400 && /schema|output_config|json_schema/i.test(detail);
        if (attempt === 0 && schemaRejected && !forcePlainJson) {
          forcePlainJson = true;
          lastDetail = detail;
          continue;
        }
        if (attempt === 0) {
          lastDetail = detail;
          continue;
        }
        throw new AIError("http", detail, { status: response.status });
      }

      const content = messageContent(payload);
      if (!content.trim()) {
        lastDetail = "The model returned an empty response.";
        if (attempt === 0) continue;
        throw new AIError("empty", lastDetail);
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(stripFences(content));
      } catch (error) {
        lastDetail = `The model returned invalid JSON: ${error instanceof Error ? error.message : "parse error"}`;
        if (attempt === 0) continue;
        throw new AIError("invalid_json", lastDetail, { cause: error });
      }

      const parsed = zodSchema.safeParse(parsedJson);
      if (!parsed.success) {
        lastDetail = zodDetail(parsed.error);
        if (attempt === 0) continue;
        throw new AIError("schema", lastDetail, { cause: parsed.error });
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof AIError) {
        if (attempt === 0 && error.code !== "missing_key" && error.status !== 401 && error.status !== 403) {
          lastDetail = error.message;
          continue;
        }
        throw error;
      }
      if (isAbortError(error)) {
        lastDetail = `The model request timed out after ${timeoutMs}ms.`;
        if (attempt === 0) continue;
        throw new AIError("timeout", lastDetail, { cause: error });
      }
      lastDetail = error instanceof Error ? error.message : "Network request failed.";
      if (attempt === 0) continue;
      throw new AIError("network", lastDetail, { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new AIError("schema", lastDetail);
}
