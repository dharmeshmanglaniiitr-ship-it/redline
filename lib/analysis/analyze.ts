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
 * What it returns is the whole `AnalysisResult` shape. The summary and the risk flags
 * are populated here; the checked-clean list and counter-offers arrive in tickets 09 and
 * 11 and return through this same function.
 *
 * Two jobs, two calls, because they are two different readings of the same text and one
 * failing is not a reason to lose the other's prompt. What keeps them honest is the same
 * thing in both cases: the narrowing in `parse` is where the real work happens. A
 * summary naming a Sender the document never mentions fails there, and so does a flag
 * quoting a sentence the document does not contain — except that the flag is dropped
 * rather than throwing, because one bad citation among four is not a reason to tell a
 * Signer nothing (`docs/adr/0001`).
 */

import {
  SETTLED_CLAUSE_TYPES,
  SEVERITY_PROPERTIES,
  type ClauseType,
  type PropertyValue,
} from "./clauses";
import type { JsonValue, ModelGateway, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { createCitationVerifier } from "./citation";
import type {
  AnalysisResult,
  DocumentSummary,
  Jurisdiction,
  RedLine,
  RiskFlag,
  Severity,
} from "./result";
import {
  deriveSeverity,
  severityTriggers,
  unstatedPropertiesOf,
  type ClauseReading,
} from "./severity";
import { costFor, flagId, hedgeNoteFor, titleFor } from "./wording";

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
 *   document — including a Sender the document never names — or when its clause
 *   readings are not clause readings of the shape that was asked for.
 */
export async function analyze(
  request: AnalysisRequest,
  gateway: ModelGateway
): Promise<AnalysisResult> {
  const [summary, flags] = await Promise.all([
    gateway.complete({
      prompt: summaryPrompt(request),
      response: summaryResponse(request.documentText),
    }),
    gateway.complete({
      prompt: flagsPrompt(request),
      response: flagsResponse(request.documentText, request.jurisdiction),
    }),
  ]);

  return {
    summary,
    flags,
    // Nothing has worked through the checklist yet (ticket 09), so nothing is reported
    // as clean. An empty list here says "not looked at", and the screen says so too —
    // a quiet result that reads like a passed contract is the one thing this product
    // must never show.
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
const SUMMARY_SCHEMA = "document_summary";

function summaryResponse(documentText: string): ResponseSchema<DocumentSummary> {
  return {
    name: SUMMARY_SCHEMA,
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
          SUMMARY_SCHEMA,
          `the summary names "${sender}" as the Sender, which does not appear in the document`
        );
      }

      return { sender, engagement, plainEnglish };
    },
  };
}

/* -------------------------------------------------------------------------------- */
/* Risk flags                                                                          */
/* -------------------------------------------------------------------------------- */

const FLAGS_SCHEMA = "clause_readings";

/**
 * What the model is asked for when it reads clauses, and what it is deliberately not
 * asked for.
 *
 * It is asked for three things per clause: which of the four settled types it is, the
 * one sentence it came from copied out character for character, and the values of the
 * properties that type's severity depends on. It is never asked how bad the clause is.
 * Severity is `deriveSeverity`'s answer, computed from those properties in code, so that
 * a Signer looking at a mark can be told what in the clause produced it
 * (`docs/adr/0003`). A number a model invented cannot be argued with; a rule can.
 *
 * Silence is expressed by omission, and the omission is load-bearing. A property left
 * out is read at its dangerous end and named in the hedge (`docs/adr/0006`), so the
 * instruction not to guess is the instruction that makes hedging mean anything. Asking
 * for a second list of "the ones I left out" would give the analysis two accounts of the
 * same gap that could disagree; `unstatedPropertiesOf` derives it from the first.
 */
function flagsPrompt(request: AnalysisRequest): string {
  return [
    "You are reading a contract for the person being asked to sign it, to find the",
    "clauses that would cost them. Report only what this document actually says.",
    "",
    "Find every clause of these four kinds. Report each one you find:",
    "",
    "- payment-approval: when the client's approval or satisfaction is what makes an",
    "  invoice payable, or what makes delivered work count as accepted.",
    "- ip-assignment: when rights in work, tools, methods or materials pass to the",
    "  client.",
    "- non-compete: when the signer is restricted, after the job ends, from taking",
    "  other work, other clients or other customers.",
    "- termination-for-convenience: when the client can end the agreement early",
    "  without the signer being at fault.",
    "",
    "For each one, return:",
    "",
    "1. clauseType: one of the four names above.",
    "2. sourceSentence: the single sentence the clause is in, copied from the contract",
    "   character for character — same words, same numbers, same punctuation, same",
    "   spacing, including any clause number at the start of it. Do not shorten it, do",
    "   not tidy it, do not join two sentences, do not quote half of one. A sentence",
    "   that does not match the contract exactly is thrown away and the clause goes",
    "   unreported, so copy rather than retype.",
    "3. properties: what the contract says about the things listed below for that",
    "   clause type.",
    "",
    "The properties, by clause type:",
    "",
    "- payment-approval — acceptanceStandard: \"objective\" if the contract sets out a",
    "  test, a criterion or a written standard the client has to apply; \"subjective\" if",
    "  it rests on the client's own satisfaction, discretion or judgment.",
    "- ip-assignment — reachesBeyondDeliverable: true if the assignment takes anything",
    "  beyond what the signer was engaged to produce, such as tools, methods or",
    "  know-how they already had, or work made after this job; false if it stops at the",
    "  deliverable.",
    "- non-compete — durationMonths: how many months the restriction runs, as a number.",
    "  geographicScope: the contract's own words for where it applies. industryScope:",
    "  the contract's own words for what work it covers. compensated: true only if the",
    "  contract says something is paid for accepting the restriction.",
    "- termination-for-convenience — killFee: what the contract says is payable for the",
    "  unfinished part, or \"absent\" where it says nothing is payable.",
    "",
    "Rules:",
    "- Leave a property out entirely when the contract does not settle it. That gap is",
    "  information: Redline reads an unstated property at whichever end costs the",
    "  signer most, and tells them the contract was silent about it. A guessed value",
    "  hides that from them.",
    "- Report a clause that is present and ordinary as readily as one that is not. What",
    "  it is worth is worked out afterwards, and a clause you leave out cannot be.",
    "- Do not report a clause that is not in the document. A risk that only exists",
    "  because the contract is silent on a whole subject has no sentence to quote and",
    "  is not reported here.",
    "- Do not rank, score or grade anything. Do not say how serious a clause is.",
    "- Do not mention law, enforceability, or what a court would do.",
    jurisdictionLine(request.jurisdiction),
    "",
    "The contract:",
    "",
    request.documentText,
  ].join("\n");
}

/**
 * The clause readings the gateway is asked to produce, turned into flags.
 *
 * This is where the ticket's two non-negotiables are actually enforced, and both of them
 * live in `parse` rather than downstream of it, so nothing that fails them can reach a
 * caller at all.
 *
 * **The citation is checked, not trusted.** Every quoted sentence is matched against the
 * parsed document by `createCitationVerifier`. A quote that does not appear verbatim as
 * a whole sentence of this document is dropped — not shown with a caveat, not repaired,
 * not replaced with a nearby sentence (`docs/adr/0001`). A caveat would hand the Signer
 * a claim they cannot check, which is the one thing the citation rule exists to prevent.
 *
 * **Severity is derived, not read.** `deriveSeverity` computes it from the properties
 * the reading carries. If the response contains a severity number it is ignored, because
 * the schema does not describe one and nothing here looks for one.
 *
 * Flags come back worst first, with ties broken by where the sentence sits in the
 * document, so the order a Signer reads is stable between runs over the same text.
 */
function flagsResponse(
  documentText: string,
  jurisdiction: Jurisdiction
): ResponseSchema<readonly RiskFlag[]> {
  return {
    name: FLAGS_SCHEMA,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["findings"],
      properties: {
        findings: {
          type: "array",
          description:
            "Every clause of one of the four types found in this document. Empty when " +
            "the document contains none of them.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["clauseType", "sourceSentence", "properties"],
            properties: {
              clauseType: { type: "string", enum: [...SETTLED_CLAUSE_TYPES] },
              sourceSentence: {
                type: "string",
                description:
                  "The one sentence this clause is in, copied from the contract " +
                  "character for character.",
              },
              properties: {
                type: "object",
                additionalProperties: false,
                description:
                  "What the contract states about this clause type's properties. A " +
                  "property the contract does not settle is left out entirely.",
                properties: {
                  acceptanceStandard: { type: "string" },
                  reachesBeyondDeliverable: { type: "boolean" },
                  durationMonths: { type: "number" },
                  geographicScope: { type: "string" },
                  industryScope: { type: "string" },
                  compensated: { type: "boolean" },
                  killFee: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    parse: (value) => {
      const root = asObject(value, FLAGS_SCHEMA, FLAGS_SCHEMA);
      const findings = root.findings;
      if (!Array.isArray(findings)) {
        throw new ModelResponseError(FLAGS_SCHEMA, "findings is not a list");
      }

      const verifier = createCitationVerifier(documentText);
      const cited: { reading: ClauseReading; sourceSentence: string }[] = [];
      const seen = new Set<string>();

      findings.forEach((entry, index) => {
        const finding = asObject(entry, `findings[${index}]`, FLAGS_SCHEMA);
        const clauseType = asClauseType(finding.clauseType, index);
        const quoted = asFilledString(
          finding.sourceSentence,
          `findings[${index}].sourceSentence`,
          FLAGS_SCHEMA
        );
        const properties = asObject(
          finding.properties,
          `findings[${index}].properties`,
          FLAGS_SCHEMA
        );

        // The whole of `docs/adr/0001`, in one line. Everything that follows is about a
        // sentence this document demonstrably contains.
        const sourceSentence = verifier.verified(quoted);
        if (sourceSentence === null) return;

        const key = `${clauseType}\u0000${sourceSentence}`;
        if (seen.has(key)) return;
        seen.add(key);

        cited.push({ reading: readingOf(clauseType, properties), sourceSentence });
      });

      // Worst first, because ten minutes spent at the top of the list should be spent on
      // the clause that costs most (user story 6). Two clauses worth the same are left
      // in the order the Signer will meet them when they scroll their own contract.
      const ranked = cited
        .map((entry) => ({
          ...entry,
          severity: deriveSeverity(entry.reading),
          at: documentText.indexOf(entry.sourceSentence),
        }))
        .sort((a, b) => b.severity - a.severity || a.at - b.at);

      const ordinals = new Map<ClauseType, number>();
      return ranked.map((entry) => {
        const ordinal = (ordinals.get(entry.reading.clauseType) ?? 0) + 1;
        ordinals.set(entry.reading.clauseType, ordinal);
        return flagFrom(entry.reading, entry.sourceSentence, entry.severity, ordinal, jurisdiction);
      });
    },
  };
}

/**
 * One clause reading, written out as the flag a Signer reads.
 *
 * The switch is not repetition for its own sake. `RiskFlag` is a union distributed over
 * clause type so that a payment-approval flag cannot carry a non-compete's properties
 * (`lib/analysis/result.ts`), and that guarantee is only worth having if the one place
 * flags are built proves it per arm. Each arm derives its own gap with
 * `unstatedPropertiesOf`, so `hedged === unstatedProperties.length > 0` and the hedge
 * names exactly those properties, by construction rather than by care (`docs/adr/0006`).
 *
 * The title and the cost are written in `lib/analysis/wording.ts`, not by the model:
 * every word a Signer reads in this product has been through the humanizer skill before
 * it shipped, and prose invented at request time has not (`CLAUDE.md`).
 */
function flagFrom(
  reading: ClauseReading,
  sourceSentence: string,
  severity: Severity,
  ordinal: number,
  jurisdiction: Jurisdiction
): RiskFlag {
  const triggers = severityTriggers(reading);
  const common = {
    id: flagId(reading.clauseType, ordinal),
    sourceSentence,
    severity,
    title: titleFor(reading, triggers),
    cost: costFor(reading, triggers, jurisdiction),
    // Ticket 11 drafts these. Null rather than a placeholder, because a placeholder
    // redraft is a thing a Signer would send to their client.
    counterOffer: null,
  };

  switch (reading.clauseType) {
    case "payment-approval": {
      const unstatedProperties = unstatedPropertiesOf("payment-approval", reading.properties);
      return {
        ...common,
        clauseType: "payment-approval",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "ip-assignment": {
      const unstatedProperties = unstatedPropertiesOf("ip-assignment", reading.properties);
      return {
        ...common,
        clauseType: "ip-assignment",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "non-compete": {
      const unstatedProperties = unstatedPropertiesOf("non-compete", reading.properties);
      return {
        ...common,
        clauseType: "non-compete",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "termination-for-convenience": {
      const unstatedProperties = unstatedPropertiesOf(
        "termination-for-convenience",
        reading.properties
      );
      return {
        ...common,
        clauseType: "termination-for-convenience",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
  }
}

/**
 * One clause's properties, narrowed to the ones its own severity function consumes.
 *
 * A key the severity function does not read is discarded rather than carried, because
 * `unstatedPropertiesOf` computes the gap from what is here: a property kept but never
 * consumed would be neither stated nor unstated, and the hedge would be describing a
 * different set from the one severity was derived from.
 */
function readingOf(
  clauseType: ClauseType,
  properties: Record<string, JsonValue>
): ClauseReading {
  switch (clauseType) {
    case "payment-approval":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "ip-assignment":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "non-compete":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "termination-for-convenience":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
  }
}

/**
 * The named properties this response actually stated.
 *
 * Anything that is not a string, a number or a boolean — null, a list, an object, a
 * missing key — is not a value a contract stated, so it is left out and counts as
 * silence. That is the conservative reading: silence pushes severity up and earns a
 * hedge, where a junk value quietly kept would do neither.
 */
function stated<Name extends string>(
  names: readonly Name[],
  properties: Record<string, JsonValue>
): Readonly<Partial<Record<Name, PropertyValue>>> {
  const kept: Partial<Record<Name, PropertyValue>> = {};
  for (const name of names) {
    const value = properties[name];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      kept[name] = value;
    }
  }
  return kept;
}

function asClauseType(value: JsonValue | undefined, index: number): ClauseType {
  if (typeof value === "string" && (SETTLED_CLAUSE_TYPES as readonly string[]).includes(value)) {
    return value as ClauseType;
  }
  throw new ModelResponseError(
    FLAGS_SCHEMA,
    `findings[${index}].clauseType is "${String(value)}", which is not a clause type ` +
      "with a settled severity rule"
  );
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

function asObject(
  value: JsonValue | undefined,
  where: string,
  schemaName = SUMMARY_SCHEMA
): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ModelResponseError(schemaName, `${where} is not an object`);
  }
  return value as Record<string, JsonValue>;
}

function asFilledString(
  value: JsonValue | undefined,
  where: string,
  schemaName = SUMMARY_SCHEMA
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ModelResponseError(schemaName, `${where} is not text`);
  }
  return value.trim();
}
