/**
 * Working out which law the analysis is reading under.
 *
 * `docs/adr/0007` settles the mechanism and this file is it, in two halves that are kept
 * apart on purpose.
 *
 * `detectJurisdiction` is the reading: one gateway call over the document, asking for the
 * governing-law clause and the sentence it is in. It is the same arrangement every other
 * reading in this product uses — a schema the provider is given, and a `parse` that does
 * the narrowing — and the narrowing here is `docs/adr/0001`'s, unchanged. A jurisdiction
 * quoted from a sentence this document does not contain is not a detection. It is not
 * repaired, not shown with a caveat and not kept as a name without its evidence: it comes
 * back as nothing, and nothing means undetermined.
 *
 * `determineJurisdiction` is the precedence, and it takes no gateway because it is not a
 * reading. The Signer's word beats the document's, the document's beats nothing, and
 * nothing is `undetermined` rather than the United States. A Signer who overrides a
 * detection keeps it: a contract naming a forum a long way from where they work is a real
 * feature of the deal, so both are carried and the screen shows both.
 *
 * What is deliberately absent is any inference. No address, no postcode, no currency
 * symbol, no company suffix and no spelling of "licence" is read as evidence of a
 * governing law, in the prompt or after it. `tests/fixtures/pair-hedge-*.txt` are two
 * Manchester contracts, priced in sterling, carrying a restriction across the whole
 * United Kingdom, with no governing-law clause anywhere in them — and the right answer on
 * both is that Redline does not know.
 */

import { createCitationVerifier } from "./citation";
import {
  UNDETERMINED_JURISDICTION,
  type Jurisdiction,
  type JurisdictionDetection,
} from "./result";
import type { JsonValue, ModelGateway, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

const JURISDICTION_SCHEMA = "governing_law";

/**
 * Read the governing law out of a document, or report that it does not name one.
 *
 * @returns the jurisdiction and the sentence it came from, or null when the document does
 *   not settle it — including when the answer quoted a sentence the document does not
 *   contain.
 * @throws {ModelResponseError} when the response is not an object at all. An answer that
 *   is shaped right and says nothing useful is not an error; it is the null case.
 */
export async function detectJurisdiction(
  documentText: string,
  gateway: ModelGateway
): Promise<JurisdictionDetection | null> {
  return gateway.complete({
    prompt: jurisdictionPrompt(documentText),
    response: jurisdictionResponse(documentText),
  });
}

/**
 * The three arms of `Jurisdiction`, decided in `docs/adr/0007`'s order.
 *
 * Pure, and separate from the call above, because the precedence is the part that has to
 * be right every time and it should be checkable without a gateway. A blank or
 * whitespace-only choice is not a choice — a Signer who clears the box is asking Redline
 * to go back to the document, not asking it to read their contract under the law of
 * nowhere.
 */
export function determineJurisdiction(
  detected: JurisdictionDetection | null,
  signerChoice: string | null
): Jurisdiction {
  const chosen = (signerChoice ?? "").trim();
  if (chosen !== "") {
    return { source: "signer", name: chosen, detected };
  }
  if (detected !== null) {
    return { source: "document", name: detected.name, sourceSentence: detected.sourceSentence };
  }
  return UNDETERMINED_JURISDICTION;
}

/**
 * What the model is asked. No test asserts on this text (`docs/spec-v1.md`, Testing
 * Decisions); what tests assert is that a document with a governing-law clause produces a
 * detection quoting it, and that two documents without one produce nothing despite being
 * full of circumstantial evidence.
 *
 * Most of the instruction is about what not to do, which is unusual here and deliberate.
 * Every other reading in this product is asked to find something in the text; this one is
 * asked to find something that is very often absent, surrounded by material that looks
 * like an answer. Naming those look-alikes is the only way to ask for the null answer
 * plainly enough that it comes back.
 */
function jurisdictionPrompt(documentText: string): string {
  return [
    "You are reading a contract to find one thing: the clause that says which law",
    "governs it.",
    "",
    "Return two things, and nothing else:",
    "",
    "1. name: the place whose law the contract says governs it, named as the contract",
    "   names it — \"England and Wales\", \"the State of New York\", \"Ireland\".",
    "2. sourceSentence: the single sentence that says so, copied from the contract",
    "   character for character — same words, same numbers, same punctuation, same",
    "   spacing, including any clause number at the start of it. Do not shorten it, do",
    "   not tidy it, do not join two sentences, do not quote half of one. A sentence that",
    "   does not match the contract exactly is thrown away and the answer is treated as",
    "   no answer, so copy rather than retype.",
    "",
    "Rules:",
    "- Only a clause saying which law governs this agreement counts. A clause naming the",
    "  courts that would hear a dispute counts as well, where it is the only thing the",
    "  contract says on the subject.",
    "- Work it out from nothing else. An address, a postcode, a currency, a telephone",
    "  number, the language the contract is written in, the spelling it uses, where the",
    "  parties are based, where a company is registered, where the work happens, or where",
    "  a restriction applies: none of those say which law governs, and an answer built",
    "  from one of them is worse than no answer, because the reader cannot tell it from a",
    "  real one.",
    "- When the contract does not say, return null for both. That is a real answer and",
    "  often the right one. Do not fall back to the law of the United States, and do not",
    "  fall back to anywhere else.",
    "",
    "The contract:",
    "",
    documentText,
  ].join("\n");
}

/**
 * The answer the gateway is asked for, and the narrowing that decides whether it is a
 * detection.
 *
 * Three ways to come back with nothing, and all three mean the same thing downstream.
 * The document named no law. The answer named a law but quoted nothing. Or it quoted
 * something the document does not contain, which `createCitationVerifier` catches on the
 * characters, exactly as it catches a misquoted flag — a Signer's next move is to search
 * their own copy for the sentence, and a citation they cannot find is worse than none.
 *
 * A handful of names are read as no answer rather than as a place. A model asked for a
 * jurisdiction and given a contract without one will sometimes write "unknown" in the
 * field instead of leaving it empty, and "the law of not specified" is not a sentence
 * this product is going to put in front of anybody.
 */
function jurisdictionResponse(
  documentText: string
): ResponseSchema<JurisdictionDetection | null> {
  return {
    name: JURISDICTION_SCHEMA,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["jurisdiction"],
      properties: {
        jurisdiction: {
          type: "object",
          additionalProperties: false,
          required: ["name", "sourceSentence"],
          description:
            "The governing law this contract states, with the sentence stating it. Both " +
            "fields are null when the contract does not state one.",
          properties: {
            name: {
              type: ["string", "null"],
              description:
                "The place whose law governs, as the contract names it. Null when the " +
                "contract does not say.",
            },
            sourceSentence: {
              type: ["string", "null"],
              description:
                "The one sentence saying so, copied from the contract character for " +
                "character. Null when there is none to copy.",
            },
          },
        },
      },
    },
    parse: (value) => {
      const root = asObject(value, JURISDICTION_SCHEMA);
      // Absent rather than null is treated the same way. A provider that leaves the key
      // out is saying what a provider writing null says.
      const stated =
        root.jurisdiction === undefined || root.jurisdiction === null
          ? {}
          : asObject(root.jurisdiction, "jurisdiction");

      const name = filledString(stated.name);
      const quoted = filledString(stated.sourceSentence);
      if (name === null || quoted === null) return null;
      if (NOT_AN_ANSWER.has(name.toLowerCase())) return null;

      // `docs/adr/0007` in one line: a jurisdiction without the sentence it came from is
      // not a detection, and neither is one whose sentence this document does not bear
      // out.
      const sourceSentence = createCitationVerifier(documentText).verified(quoted);
      if (sourceSentence === null) return null;

      return { name, sourceSentence };
    },
  };
}

/** Words a model writes into the field when it means the field should have been empty. */
const NOT_AN_ANSWER = new Set([
  "undetermined",
  "unknown",
  "none",
  "not specified",
  "not stated",
  "unspecified",
  "n/a",
  "na",
  "null",
]);

function asObject(value: JsonValue | undefined, where: string): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ModelResponseError(JURISDICTION_SCHEMA, `${where} is not an object`);
  }
  return value as Record<string, JsonValue>;
}

function filledString(value: JsonValue | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
