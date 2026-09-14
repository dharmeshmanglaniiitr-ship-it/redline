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
 * What it returns is the whole `AnalysisResult` shape: the summary, the risk flags with
 * a drafted counter-offer on each of them, and the checked-clean list.
 *
 * Three jobs, three calls, because they are three different readings of the same text
 * and one failing is not a reason to lose the others' prompts. What keeps them honest is
 * the same thing in every case: the narrowing in `parse` is where the real work happens.
 * A summary naming a Sender the document never mentions fails there, and so does a flag
 * quoting a sentence the document does not contain — except that the flag is dropped
 * rather than throwing, because one bad citation among four is not a reason to tell a
 * Signer nothing (`docs/adr/0001`). An examination that skips a checklist entry fails
 * there too, and that one throws: a clean bill missing a line is worse than no clean
 * bill, because the Signer cannot see which line is missing.
 */

import {
  CHECKLIST_ENTRIES,
  SETTLED_CLAUSE_TYPES,
  SEVERITY_PROPERTIES,
  type ChecklistEntry,
  type ClauseType,
  type PropertyValue,
} from "./clauses";
import type { JsonValue, ModelGateway, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { clearedList, type ChecklistVerdict } from "./checklist";
import { createCitationVerifier } from "./citation";
import {
  contractVocabulary,
  counterOfferFor,
  type ContractVocabulary,
} from "./counter-offer";
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
  const [summary, flags, examined] = await Promise.all([
    gateway.complete({
      prompt: summaryPrompt(request),
      response: summaryResponse(request.documentText),
    }),
    gateway.complete({
      prompt: flagsPrompt(request),
      response: flagsResponse(request.documentText, request.jurisdiction),
    }),
    gateway.complete({
      prompt: checklistPrompt(request),
      response: checklistResponse(),
    }),
  ]);

  return {
    summary,
    flags,
    // Derived from both readings rather than taken from either. An entry is reported
    // clean only if the examination reached it and the findings do not contradict it,
    // and `clearedList` is the only thing that can make this value
    // (`lib/analysis/checklist.ts`).
    checkedClean: clearedList(examined, flags),
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
 * It is asked for three things per clause: which of the settled types it is, the
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
    "Find every clause of these eight kinds. Report each one you find:",
    "",
    "- payment-approval: when the client's approval or satisfaction is what makes an",
    "  invoice payable, or what makes delivered work count as accepted.",
    "- ip-assignment: when rights in work, tools, methods or materials pass to the",
    "  client.",
    "- non-compete: when the signer is restricted, after the job ends, from taking",
    "  other work, other clients or other customers.",
    "- termination-for-convenience: when the client can end the agreement early",
    "  without the signer being at fault.",
    "- one-sided-indemnity: when the signer promises to cover claims, losses or costs",
    "  brought against the client by someone outside this contract.",
    "- uncapped-liability: when the agreement says how much either party can be made",
    "  to pay, or says that a party's liability is not limited.",
    "- auto-renewal: when the agreement continues into a further term without anyone",
    "  signing again.",
    "- unilateral-change: when the client can alter the fee, the work or the terms,",
    "  and also when a change is said to require both parties' agreement.",
    "",
    "For each one, return:",
    "",
    "1. clauseType: one of the eight names above.",
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
    "- one-sided-indemnity — mutual: true only if the client promises the signer the",
    "  same cover the signer promises the client. triggeringClaims: the contract's own",
    "  words for what sets the promise off. cappedByLiabilityLimit: true only if the",
    "  contract says the promise is subject to its limit of liability.",
    "- uncapped-liability — liabilityCap: the contract's own words for the ceiling on",
    "  what the signer could be made to pay, or \"none\" where it says there is no limit.",
    "  capAppliesToSigner: true only if that ceiling limits the signer's own liability",
    "  and not only the client's. capProportionateToFee: true only if the ceiling is",
    "  tied to the fees under this agreement or to a figure of that order.",
    "- auto-renewal — renewalTermMonths: how many months each further term runs, as a",
    "  number. noticeWindowDays: how many days before the end of a term the signer has",
    "  to give notice to stop it renewing, as a number. terminableDuringRenewal: true",
    "  only if the signer can end a renewed term before it expires.",
    "- unilateral-change — changeRequiresSignerAgreement: true only if a change takes",
    "  effect once the signer has agreed to it in writing. whatMayChange: the",
    "  contract's own words for what may be changed. exitOnChange: true only if the",
    "  signer may end the agreement, without penalty, because of a change.",
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
            "Every clause of one of the eight types found in this document. Empty when " +
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
                  mutual: { type: "boolean" },
                  triggeringClaims: { type: "string" },
                  cappedByLiabilityLimit: { type: "boolean" },
                  liabilityCap: { type: "string" },
                  capAppliesToSigner: { type: "boolean" },
                  capProportionateToFee: { type: "boolean" },
                  renewalTermMonths: { type: "number" },
                  noticeWindowDays: { type: "number" },
                  terminableDuringRenewal: { type: "boolean" },
                  changeRequiresSignerAgreement: { type: "boolean" },
                  whatMayChange: { type: "string" },
                  exitOnChange: { type: "boolean" },
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

      // Read once for the document rather than once per flag: the parties' defined terms
      // are a fact about the contract, and every redraft over it speaks in the same ones.
      const vocabulary = contractVocabulary(documentText);

      const ordinals = new Map<ClauseType, number>();
      return ranked.map((entry) => {
        const ordinal = (ordinals.get(entry.reading.clauseType) ?? 0) + 1;
        ordinals.set(entry.reading.clauseType, ordinal);
        return flagFrom(
          entry.reading,
          entry.sourceSentence,
          entry.severity,
          ordinal,
          jurisdiction,
          vocabulary
        );
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
 * The title, the cost and the counter-offer are written in `lib/analysis/wording.ts` and
 * `lib/analysis/counter-offer.ts`, not by the model: every word a Signer reads in this
 * product has been through the humanizer skill before it shipped, and prose invented at
 * request time has not (`CLAUDE.md`). That argument is at its strongest on the redraft,
 * which is not only read but sent, under the Signer's own name.
 *
 * The counter-offer's `replaces` is this flag's own `sourceSentence`, handed straight
 * across. So a redraft can only ever claim to replace a sentence the citation check
 * upstream has already matched against the document, and `docs/adr/0001` covers the
 * counter-offer without a second mechanism.
 */
function flagFrom(
  reading: ClauseReading,
  sourceSentence: string,
  severity: Severity,
  ordinal: number,
  jurisdiction: Jurisdiction,
  vocabulary: ContractVocabulary
): RiskFlag {
  const triggers = severityTriggers(reading);
  const common = {
    id: flagId(reading.clauseType, ordinal),
    sourceSentence,
    severity,
    title: titleFor(reading, triggers),
    cost: costFor(reading, triggers, jurisdiction),
    counterOffer: counterOfferFor(reading, sourceSentence, triggers, vocabulary),
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
    case "one-sided-indemnity": {
      const unstatedProperties = unstatedPropertiesOf(
        "one-sided-indemnity",
        reading.properties
      );
      return {
        ...common,
        clauseType: "one-sided-indemnity",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "uncapped-liability": {
      const unstatedProperties = unstatedPropertiesOf("uncapped-liability", reading.properties);
      return {
        ...common,
        clauseType: "uncapped-liability",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "auto-renewal": {
      const unstatedProperties = unstatedPropertiesOf("auto-renewal", reading.properties);
      return {
        ...common,
        clauseType: "auto-renewal",
        properties: reading.properties,
        unstatedProperties,
        hedged: unstatedProperties.length > 0,
        hedgeNote: hedgeNoteFor(unstatedProperties),
      };
    }
    case "unilateral-change": {
      const unstatedProperties = unstatedPropertiesOf("unilateral-change", reading.properties);
      return {
        ...common,
        clauseType: "unilateral-change",
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
    case "one-sided-indemnity":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "uncapped-liability":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "auto-renewal":
      return { clauseType, properties: stated(SEVERITY_PROPERTIES[clauseType], properties) };
    case "unilateral-change":
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

/* -------------------------------------------------------------------------------- */
/* The checklist examination                                                           */
/* -------------------------------------------------------------------------------- */

const CHECKLIST_SCHEMA = "checklist_examination";

/**
 * What the model is asked when it works down the checklist.
 *
 * This is a separate reading from the flags, and it stays separate now that both cover
 * the same eight entries. They answer different questions. The flags pass asks what a
 * clause says, clause by clause, and returns nothing for a subject the contract never
 * raises — silence has no sentence to quote (`docs/adr/0001`). This pass asks whether
 * each entry was read and came back with nothing to take up, which is exactly the claim
 * a contract's silence supports and a flag cannot make. Keeping them apart is what lets
 * a Signer tell "we looked and there is nothing here" from "we never looked".
 *
 * Every entry has to come back with a verdict, and the instruction says so, because the
 * whole value of this list is that a Signer can tell "we looked and found nothing" from
 * "we never looked". Absence of an answer is the failure case, which is why the schema
 * makes it a rejection rather than a shorter list.
 *
 * Clearing is not the same as silence. A contract with no restrictive covenant clears on
 * `non-compete`, and so does one whose covenant costs the Signer nothing; a point the
 * reading could not settle from the text clears on neither.
 */
function checklistPrompt(request: AnalysisRequest): string {
  return [
    "You are working down a fixed checklist over a contract, for the person being asked",
    "to sign it. Report only what this document actually says.",
    "",
    "These are the eight things Redline checks on a freelance contract. Go through all",
    "eight, whether or not the contract mentions them:",
    "",
    "- payment-approval: what the signer's work has to meet before it counts as",
    "  accepted and the invoice becomes payable.",
    "- ip-assignment: what rights in the work pass to the client, and whether they stop",
    "  at what the signer was engaged to produce.",
    "- non-compete: what the signer is stopped from taking on once the job ends.",
    "- termination-for-convenience: what the client owes if they end the agreement",
    "  early without the signer being at fault.",
    "- one-sided-indemnity: whether the signer has to cover the client's third-party",
    "  claims without the client covering the signer's.",
    "- uncapped-liability: whether anything puts a ceiling on what the signer could be",
    "  made to pay.",
    "- auto-renewal: whether the agreement renews itself without the signer agreeing",
    "  again.",
    "- unilateral-change: whether the client can change the fee, the scope or the terms",
    "  on their own.",
    "",
    "For each entry return its name and cleared: true or false.",
    "",
    "- cleared: true means you read the contract on that point and there is nothing the",
    "  signer needs to take up — either the contract does not do that thing at all, or",
    "  it does it on terms that cost the signer nothing. A termination clause that pays",
    "  for the unfinished work is clear. A contract with no restriction after the job",
    "  is clear.",
    "- cleared: false means there is something for the signer to take up, and also",
    "  covers the case where the contract left you unable to settle the point. An open",
    "  question is not the same answer as nothing to report, and must not be given as",
    "  one.",
    "",
    "Rules:",
    "- Answer on all eight, once each. An entry you leave out is read as an entry",
    "  nothing looked at, and the whole answer is thrown away rather than shown to the",
    "  signer as a shorter clean bill.",
    "- Do not rank, score or grade anything, and do not say how serious a clause is.",
    "- Do not mention law, enforceability, or what a court would do.",
    jurisdictionLine(request.jurisdiction),
    "",
    "The contract:",
    "",
    request.documentText,
  ].join("\n");
}

/**
 * The examination the gateway is asked to produce, and the narrowing that makes a clean
 * bill a claim rather than a courtesy.
 *
 * Three things fail here rather than downstream. An entry that is not on the checklist
 * is not an entry at all. The same entry answered twice is two accounts of one reading
 * that could disagree, so neither is taken. And an entry left out fails the whole
 * examination: a shorter list would still render as a clean bill, one line quieter, with
 * nothing on the screen to say which line went missing.
 *
 * What it does not do is decide anything. Whether a cleared entry is actually reported
 * clean is `clearedList`'s answer, computed against the flags
 * (`lib/analysis/checklist.ts`).
 */
function checklistResponse(): ResponseSchema<readonly ChecklistVerdict[]> {
  return {
    name: CHECKLIST_SCHEMA,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["checklist"],
      properties: {
        checklist: {
          type: "array",
          description:
            "One verdict for each of the eight checklist entries, in the order they " +
            "were given. All eight are required.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["entry", "cleared"],
            properties: {
              entry: { type: "string", enum: [...CHECKLIST_ENTRIES] },
              cleared: {
                type: "boolean",
                description:
                  "True only when the contract was read on this point and there is " +
                  "nothing for the signer to take up.",
              },
            },
          },
        },
      },
    },
    parse: (value) => {
      const root = asObject(value, "the examination", CHECKLIST_SCHEMA);
      const checklist = root.checklist;
      if (!Array.isArray(checklist)) {
        throw new ModelResponseError(CHECKLIST_SCHEMA, "checklist is not a list");
      }

      const verdicts = new Map<ChecklistEntry, ChecklistVerdict>();
      checklist.forEach((item, index) => {
        const where = `checklist[${index}]`;
        const verdict = asObject(item, where, CHECKLIST_SCHEMA);
        const entry = asChecklistEntry(verdict.entry, where);
        if (typeof verdict.cleared !== "boolean") {
          throw new ModelResponseError(
            CHECKLIST_SCHEMA,
            `${where}.cleared is "${String(verdict.cleared)}", which is not a verdict`
          );
        }
        if (verdicts.has(entry)) {
          throw new ModelResponseError(
            CHECKLIST_SCHEMA,
            `the examination answers "${entry}" twice`
          );
        }
        verdicts.set(entry, { entry, cleared: verdict.cleared });
      });

      // The half of `docs/spec-v1.md`'s clean-bill test that the list's own contents
      // cannot show: an entry with no verdict was not examined, and an examination that
      // did not cover the checklist is not one a clean bill can be built from.
      const missing = CHECKLIST_ENTRIES.filter((entry) => !verdicts.has(entry));
      if (missing.length > 0) {
        throw new ModelResponseError(
          CHECKLIST_SCHEMA,
          `the examination says nothing about ${missing.join(", ")}, so those entries ` +
            "were not checked"
        );
      }

      return [...verdicts.values()];
    },
  };
}

function asChecklistEntry(value: JsonValue | undefined, where: string): ChecklistEntry {
  if (typeof value === "string" && (CHECKLIST_ENTRIES as readonly string[]).includes(value)) {
    return value as ChecklistEntry;
  }
  throw new ModelResponseError(
    CHECKLIST_SCHEMA,
    `${where}.entry is "${String(value)}", which is not on the checklist`
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
