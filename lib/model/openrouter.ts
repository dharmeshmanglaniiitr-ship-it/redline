/**
 * The gateway that actually calls a model, through OpenRouter's OpenAI-compatible
 * endpoint (`CLAUDE.md`).
 *
 * It implements `ModelGateway` and nothing else knows it exists: the analysis seams take
 * a gateway as an argument, so this file is reachable only from the server code that
 * builds one. Which model answers, which provider serves it, how hard it thinks and how
 * structured output is asked for are all settled here, behind the interface, because a
 * caller that knew any of it would have to be changed when it changed.
 *
 * Two rules about the key. It is read from the environment, never written down: nothing
 * in this repo contains a key or a model id, and `OPENROUTER_MODEL` unset is a stated
 * error rather than a guessed default, because a guessed model silently produces
 * different analysis from the one that was tested. And it is server-side only —
 * `process.env.OPENROUTER_API_KEY` carries no `NEXT_PUBLIC_` prefix, so Next.js never
 * inlines it into a browser bundle, and this module is imported only from server code.
 */

import type { JsonValue, ModelGateway, ModelRequest } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * One provider, no substitutes, and it has to support everything asked of it. Routing
 * that silently falls back would mean two Signers reading the same contract get analysis
 * from two different models, with no way to tell which.
 */
const PROVIDER = {
  order: ["fireworks"],
  allow_fallbacks: false,
  require_parameters: true,
} as const;

/** A long contract and a reasoning model together are slow, but not this slow. */
const TIMEOUT_MS = 90_000;

/**
 * A ceiling on the answer, not on the contract.
 *
 * Left unset, the request reserves the model's entire completion window, and OpenRouter
 * prices the call against that reservation rather than against what comes back — which
 * is enough on its own to refuse the call. Everything asked for here is a few paragraphs
 * of JSON, with room left for the reasoning that precedes it.
 */
const MAX_TOKENS = 4096;

/** The environment variables model access needs. Spelled out, never built from parts. */
export type OpenRouterVariable = "OPENROUTER_API_KEY" | "OPENROUTER_MODEL";

/**
 * Whether this deployment can call a model, and a gateway when it can.
 *
 * Modelled the way `supabaseConfig()` models accounts: an unconfigured environment is a
 * state the product handles and says out loud, not an exception thrown from underneath a
 * Signer who was reading a contract. `missing` names the variables so the message a
 * Signer sees and the line in the log both say which one it was.
 */
export type ModelAccess =
  | { readonly outcome: "ready"; readonly gateway: ModelGateway }
  | { readonly outcome: "not-set-up"; readonly missing: readonly OpenRouterVariable[] };

/** Read model access out of the environment. Never throws, never guesses a model. */
export function openRouterAccess(): ModelAccess {
  const apiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  const model = (process.env.OPENROUTER_MODEL ?? "").trim();

  const missing: OpenRouterVariable[] = [];
  if (apiKey === "") missing.push("OPENROUTER_API_KEY");
  if (model === "") missing.push("OPENROUTER_MODEL");
  if (missing.length > 0) return { outcome: "not-set-up", missing };

  return { outcome: "ready", gateway: createOpenRouterGateway({ apiKey, model }) };
}

export interface OpenRouterCredentials {
  readonly apiKey: string;
  /** The model id, from `OPENROUTER_MODEL`. It is never written into source. */
  readonly model: string;
}

/** Thrown when the call itself did not come back: network, timeout, or an error status. */
export class ModelCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelCallError";
  }
}

/**
 * A gateway over one set of credentials.
 *
 * Every call asks for structured output against the caller's own JSON Schema and runs
 * the answer through the caller's `parse`, so a response that does not match the shape
 * that was asked for fails here rather than downstream holding a lying type.
 */
export function createOpenRouterGateway(credentials: OpenRouterCredentials): ModelGateway {
  return {
    async complete<Shape>(request: ModelRequest<Shape>): Promise<Shape> {
      const body = {
        model: credentials.model,
        provider: PROVIDER,
        reasoning: { effort: "low" },
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: request.prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.response.name,
            strict: true,
            schema: request.response.schema,
          },
        },
      };

      let response: Response;
      try {
        response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (cause) {
        throw new ModelCallError(`the call to OpenRouter did not complete: ${reason(cause)}`);
      }

      if (!response.ok) {
        // The body carries the provider's own explanation. It is for the log.
        throw new ModelCallError(
          `OpenRouter answered ${response.status}: ${(await safeText(response)).slice(0, 500)}`
        );
      }

      const payload = await parseJson(response, "the OpenRouter response");
      return request.response.parse(contentOf(payload, request.response.name));
    },
  };
}

/** Pull the JSON the model produced out of the chat-completion envelope. */
function contentOf(payload: JsonValue, schemaName: string): JsonValue {
  const envelope = payload as {
    error?: { message?: string };
    choices?: readonly { message?: { content?: unknown } }[];
  };

  if (envelope.error !== undefined) {
    throw new ModelCallError(`OpenRouter returned an error: ${envelope.error.message ?? "no message"}`);
  }

  const content = envelope.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ModelResponseError(schemaName, "the model returned no content");
  }

  try {
    return JSON.parse(content) as JsonValue;
  } catch {
    throw new ModelResponseError(schemaName, "the model returned something that is not JSON");
  }
}

async function parseJson(response: Response, what: string): Promise<JsonValue> {
  const text = await safeText(response);
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    throw new ModelCallError(`${what} was not JSON: ${text.slice(0, 200)}`);
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (cause) {
    return `the body could not be read: ${reason(cause)}`;
  }
}

function reason(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
