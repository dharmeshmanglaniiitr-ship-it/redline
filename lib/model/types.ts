/**
 * The seam between Redline's analysis and whatever produces its JSON.
 *
 * The analysis seams are pure functions over document text (`docs/spec-v1.md`,
 * Implementation Decisions). Everything model-shaped sits behind this one interface, so
 * the same `analyze()` runs against the real OpenRouter client in production and against
 * a fixture-driven stub in the test suite, with no browser, no API key and no network.
 *
 * Deliberately narrow. There is one method, and a request carries only a prompt and the
 * response shape being asked for. Anything that varies by provider — model id, routing,
 * reasoning effort, retries, structured-output plumbing — belongs to the implementation
 * behind this interface, not to its callers, and no model id is ever written into code
 * that imports from here.
 */

/** A JSON value, as it comes back from a model that was asked for structured output. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** A JSON object. Used here for the JSON Schema document sent to the provider. */
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * The response a caller is asking for: the JSON Schema the provider is given, and the
 * narrowing that turns the JSON it returns into `Shape`.
 *
 * `parse` is what makes the result genuinely typed rather than asserted. A gateway runs
 * every response through it, so a provider that returns JSON not matching the schema
 * fails at the seam instead of somewhere downstream holding a lying type.
 */
export interface ResponseSchema<Shape> {
  /** Names the schema for the provider, e.g. "document_summary". */
  readonly name: string;
  /** A JSON Schema document describing `Shape`, passed to the provider unchanged. */
  readonly schema: JsonObject;
  /** Narrows one JSON response to `Shape`, or throws `ModelResponseError`. */
  readonly parse: (value: JsonValue) => Shape;
}

/** One call: what to ask, and what shape the answer has to come back in. */
export interface ModelRequest<Shape> {
  readonly prompt: string;
  readonly response: ResponseSchema<Shape>;
}

/** Thrown when a response cannot be parsed into the shape its schema described. */
export class ModelResponseError extends Error {
  constructor(
    readonly schemaName: string,
    message: string
  ) {
    super(`${schemaName}: ${message}`);
    this.name = "ModelResponseError";
  }
}

/**
 * The gateway itself.
 *
 * @throws {ModelResponseError} when the response does not satisfy `request.response`.
 */
export interface ModelGateway {
  complete<Shape>(request: ModelRequest<Shape>): Promise<Shape>;
}
