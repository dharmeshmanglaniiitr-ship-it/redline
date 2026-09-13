/**
 * The analysis seam: document text in, a structured result out.
 *
 * `analyze` is a pure function over text (`docs/spec-v1.md`, Implementation Decisions).
 * It takes its gateway as an argument rather than reaching for one, so the test suite
 * drives it with a fixture-backed stub and production hands it the OpenRouter client,
 * and every behavioural claim about the analysis can be checked with no browser, no
 * network and no API key.
 *
 * It takes text, not a document. A document that could not be read has no `text` field
 * to pass (`lib/document/extraction.ts`), so an unreadable file cannot reach this
 * function — the compiler stops it, which is the one guarantee worth having here: a
 * scanned contract must never come back looking like a contract with nothing wrong in
 * it.
 *
 * What it returns is the whole `AnalysisResult` shape. This ticket populates the
 * summary; flags, the checked-clean list and counter-offers arrive in tickets 08, 09 and
 * 11 and return through this same function.
 */

import type { JsonValue, ModelGateway, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import type {
  AnalysisResult,
  DocumentSummary,
  Jurisdiction,
  RedLine,
} from "./result";

/** What the analysis is given: the text, the Signer's standard, and the law it assumes. */
export interface AnalysisRequest {
  /** The document's extracted text, as `readExtractedText` normalized it. */
  readonly documentText: string;
  /** The Signer's own red lines. They rank findings (ticket 13), not the summary. */
  readonly redLines: readonly RedLine[];
  /** Never defaulted. `undetermined` is a state the analysis runs in (`docs/adr/0007`). */
  readonly jurisdiction: Jurisdiction;
}

/**
 * Read a document and report what it commits the Signer to.
 *
 * @throws {ModelResponseError} when the gateway's answer is not a summary of this
 *   document — including a Sender the document never names.
 */
export async function analyze(
  request: AnalysisRequest,
  gateway: ModelGateway
): Promise<AnalysisResult> {
  const summary = await gateway.complete({
    prompt: summaryPrompt(request),
    response: summaryResponse(request.documentText),
  });

  return {
    summary,
    // Nothing has looked for a risky clause yet (ticket 08), and nothing has worked
    // through the checklist yet (ticket 09). Both are reported as what they are.
    flags: [],
    checkedClean: [],
    jurisdiction: request.jurisdiction,
    redLines: request.redLines,
  };
}

/**
 * What the model is asked for.
 *
 * No test asserts on this text (`docs/spec-v1.md`, Testing Decisions) — it will change
 * as the summary is tuned, and a test pinned to it would be deleted rather than
 * maintained. What tests assert is that the Sender is named, the engagement identified,
 * and both grounded in the document that was passed in.
 */
function summaryPrompt(request: AnalysisRequest): string {
  return [
    "You are summarising a contract for the person being asked to sign it. They did not",
    "write it and may never have read a contract closely before.",
    "",
    "Write three things, and nothing else:",
    "",
    "1. sender: the other party to this contract — the one who drafted it and sent it —",
    "   named exactly as the contract writes their name, character for character.",
    "2. engagement: one sentence saying what work the contract covers, including the",
    "   money and the dates when the contract states them.",
    "3. plainEnglish: two or three short paragraphs, separated by a blank line, saying",
    "   what signing would commit the reader to. Address them as \"you\". Use the words",
    "   an ordinary person uses, not the contract's own legal wording, and explain any",
    "   defined term rather than repeating it.",
    "",
    "Rules:",
    "- State only what this contract says. If it does not say something, leave it out.",
    "  Do not fill a gap with what contracts usually say.",
    "- Do not judge the contract, rank anything as risky, or advise whether to sign.",
    "  That is a separate job and this is not it.",
    "- Do not mention law, enforceability, or what a court would do.",
    jurisdictionLine(request.jurisdiction),
    "",
    "The contract:",
    "",
    request.documentText,
  ].join("\n");
}

function jurisdictionLine(jurisdiction: Jurisdiction): string {
  return jurisdiction.source === "undetermined"
    ? "- The governing law is not settled, so assume nothing about where this contract sits."
    : `- This contract is being read under the law of ${jurisdiction.name}, which changes nothing about what its words say.`;
}

/**
 * The response the gateway is asked to produce, and the narrowing that makes it a
 * `DocumentSummary` rather than an assertion that it is one.
 *
 * The schema is what a provider is given for structured output; `parse` runs on every
 * answer, the stub's included, so a summary that is missing a field or names a Sender
 * this document never mentions fails here at the seam. Grounding the Sender in the text
 * is `CLAUDE.md`'s rule made mechanical: the product states what the document says, and
 * the one part of the summary that can be checked against the text is checked.
 */
function summaryResponse(documentText: string): ResponseSchema<DocumentSummary> {
  return {
    name: "document_summary",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: {
        summary: {
          type: "object",
          additionalProperties: false,
          required: ["sender", "engagement", "plainEnglish"],
          properties: {
            sender: {
              type: "string",
              description: "The other party, named exactly as the contract names them.",
            },
            engagement: {
              type: "string",
              description: "One sentence: what work the contract covers.",
            },
            plainEnglish: {
              type: "string",
              description:
                "Two or three short paragraphs, separated by a blank line, saying what " +
                "signing commits the reader to.",
            },
          },
        },
      },
    },
    parse: (value) => {
      const root = asObject(value, "document_summary");
      const summary = asObject(root.summary, "document_summary.summary");
      const sender = asFilledString(summary.sender, "summary.sender");
      const engagement = asFilledString(summary.engagement, "summary.engagement");
      const plainEnglish = asFilledString(summary.plainEnglish, "summary.plainEnglish");

      if (!namedIn(documentText, sender)) {
        throw new ModelResponseError(
          "document_summary",
          `the summary names "${sender}" as the Sender, which does not appear in the document`
        );
      }

      return { sender, engagement, plainEnglish };
    },
  };
}

/**
 * Whether the document names this party.
 *
 * Compared on letters and digits with everything else collapsed to single spaces, so a
 * name copied faithfully still matches across the punctuation and line breaks a PDF
 * leaves in the middle of it. The usual case is containment: a document reading
 * "Harbourline Retail Group Limited (the \"Client\")" names "Harbourline Retail Group
 * Limited". The second pass is for the answer that carries a bracketed defined term or
 * an office along with the name, where every word of the name is in the document even
 * though the whole string is not.
 *
 * What it is for is a name that is not in the contract at all. A summary that invents
 * who sent the document is the one part of it that can be checked against the text, so
 * it is checked, and the analysis fails rather than telling a Signer their contract came
 * from a company that never appears in it.
 */
function namedIn(documentText: string, party: string): boolean {
  const document = comparable(documentText);
  const needle = comparable(party);
  if (needle === "") return false;
  if (document.includes(needle)) return true;

  const words = needle.split(" ").filter((word) => word.length >= 4);
  return words.length > 0 && words.every((word) => document.includes(word));
}

function comparable(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function asObject(value: JsonValue | undefined, where: string): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ModelResponseError("document_summary", `${where} is not an object`);
  }
  return value as Record<string, JsonValue>;
}

function asFilledString(value: JsonValue | undefined, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ModelResponseError("document_summary", `${where} is not text`);
  }
  return value.trim();
}
