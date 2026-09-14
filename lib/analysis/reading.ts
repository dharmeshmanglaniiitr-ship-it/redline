/**
 * A reading as it is written down and read back, which is the whole of what the library
 * keeps (`docs/adr/0010`).
 *
 * `AnalysisResult` is what the analysis produces in memory. This is the same thing after a
 * database round trip, and the trip is where the guarantees the types carry would quietly
 * be lost if nothing here put them back:
 *
 * - **`checkedClean` is branded** (`lib/analysis/checklist.ts`). The brand lives in the type
 *   and nowhere in the bytes, so what comes back out of Postgres is an array of strings with
 *   no claim attached to it. It is not asserted back into shape here. It is rebuilt by
 *   `clearedList` from the stored entries *and the stored flags*, which is the one function
 *   that can make one — so an entry a stored flag contradicts cannot be reported clean
 *   however the row was written.
 * - **Every flag cites its source** (`docs/adr/0001`). A stored citation is checked against
 *   the document's own stored text on the way out, with the same verifier the analysis used
 *   on the way in. A saved reading is therefore exactly as checkable as a fresh one: the
 *   Signer can still search their own copy for the quoted sentence and find it.
 * - **`hedged === unstatedProperties.length > 0`** (`docs/adr/0006`), and a hedge names only
 *   properties its own clause type's severity function consumes. Both are checked rather
 *   than believed.
 *
 * Nothing here trusts what it is given. The same function reads what a browser posts to be
 * kept and what a database hands back months later, because they are the same claim — "this
 * is what Redline said about this document" — arriving from a place that could be wrong. A
 * reading that does not hold up comes back as one that could not be read, never as a
 * shorter list of findings: a Signer shown four flags where five were saved has been told
 * something false about their own contract.
 */

import { createCitationVerifier, type CitationVerifier } from "./citation";
import { clearedList, type ChecklistVerdict } from "./checklist";
import {
  CHECKLIST_ENTRIES,
  SETTLED_CLAUSE_TYPES,
  SEVERITY_PROPERTIES,
  type ChecklistEntry,
  type ClauseType,
  type PropertyValue,
} from "./clauses";
import type {
  AnalysisResult,
  CounterOffer,
  DocumentSummary,
  Jurisdiction,
  RedLineCrossing,
  RiskFlag,
  Severity,
} from "./result";

/**
 * A reading in the shape it is stored and posted in.
 *
 * Two differences from `AnalysisResult`, both deliberate. `checkedClean` is a plain list of
 * entry names, because the brand cannot cross a wire and pretending otherwise is the bug
 * this module exists to avoid. And there is no `jurisdiction`: what the reading assumed
 * about governing law is already a set of columns on `public.documents`, written from the
 * same object at the same moment (`docs/adr/0007`), and storing it twice is storing two
 * things that can disagree.
 */
export interface RecordedReading {
  readonly summary: DocumentSummary;
  readonly flags: readonly RiskFlag[];
  readonly checkedClean: readonly ChecklistEntry[];
  /** The Signer's own lines as they stood when this was read, verbatim. */
  readonly redLines: readonly string[];
}

/** A stored reading, or the reason it could not be read back. */
export type ReadBackReading =
  | { readonly outcome: "read"; readonly result: AnalysisResult }
  /** `problem` is for the log. What a Signer is told is that the reading did not open. */
  | { readonly outcome: "unreadable"; readonly problem: string };

/**
 * One reading, ready to be written down.
 *
 * A projection and nothing else — it drops the brand, which the row cannot carry, and
 * flattens the red lines to the Signer's own words. Everything else goes as it stands,
 * because the point of the library is that what is stored is what they were shown.
 */
export function recordReading(result: AnalysisResult): RecordedReading {
  return {
    summary: result.summary,
    flags: result.flags,
    checkedClean: [...result.checkedClean],
    redLines: result.redLines.map((redLine) => redLine.text),
  };
}

/**
 * Read a stored reading back into the result the screen draws, or say why it could not be.
 *
 * `documentText` is the document's own stored text, and every citation is checked against
 * it. `jurisdiction` is rebuilt from the document's row by the caller, because that is
 * where ADR 0007's record lives.
 */
export function readBackReading(
  recorded: unknown,
  documentText: string,
  jurisdiction: Jurisdiction
): ReadBackReading {
  try {
    const reading = asObject(recorded, "the reading");
    const verifier = createCitationVerifier(documentText);

    const flags = asArray(reading.flags, "flags").map((flag, index) =>
      readFlag(flag, verifier, `flag ${index + 1}`)
    );

    return {
      outcome: "read",
      result: {
        summary: readSummary(reading.summary),
        flags,
        // Rebuilt, never asserted. `clearedList` is the only thing that can make a
        // `ClearedChecklist`, and it reads the flags, so this is also the point at which a
        // stored entry that a stored flag contradicts stops being reported clean.
        checkedClean: clearedList(readClearedEntries(reading.checkedClean), flags),
        jurisdiction,
        redLines: asArray(reading.redLines, "redLines").map((line, index) => ({
          text: asText(line, `red line ${index + 1}`),
        })),
      },
    };
  } catch (cause) {
    if (cause instanceof NotAReading) return { outcome: "unreadable", problem: cause.message };
    throw cause;
  }
}

/**
 * Why a stored reading was refused. Private, and thrown rather than returned, so each check
 * below reads as the one thing it is checking instead of as a chain of unwrapped results.
 */
class NotAReading extends Error {}

function refuse(problem: string): never {
  throw new NotAReading(problem);
}

function readSummary(value: unknown): DocumentSummary {
  const summary = asObject(value, "the summary");
  const plainEnglish = asText(summary.plainEnglish, "the summary's plain-English account");
  // A summary with nothing in it would draw as a document that committed the Signer to
  // nothing, which is the reading this product must never show by accident
  // (`docs/spec-v1.md`).
  if (plainEnglish.trim() === "") refuse("the stored summary says nothing");

  return {
    sender: asText(summary.sender, "the Sender's name"),
    engagement: asText(summary.engagement, "the engagement"),
    plainEnglish,
  };
}

/**
 * The stored entries, as verdicts for `clearedList` to read.
 *
 * An entry this codebase no longer has a name for is refused rather than dropped. Dropping
 * it would quietly shorten "6 of 8 came back clean" on a reading nobody re-ran, which is
 * the sort of silent edit to somebody's record that `docs/adr/0010` is written against.
 */
function readClearedEntries(value: unknown): ChecklistVerdict[] {
  return asArray(value, "checkedClean").map((entry, index) => {
    const name = asText(entry, `cleared entry ${index + 1}`);
    if (!isChecklistEntry(name)) {
      refuse(`the reading clears "${name}", which is not on Redline's checklist any more`);
    }
    return { entry: name, cleared: true };
  });
}

/**
 * One stored flag, checked against everything the type system promises about a live one.
 *
 * The clause type is read first because everything after it is judged against that clause
 * type's own properties: a stored non-compete may not claim a payment clause's acceptance
 * standard was unstated, for the same reason the union in `lib/analysis/result.ts` will not
 * let a live one.
 */
function readFlag(value: unknown, verifier: CitationVerifier, where: string): RiskFlag {
  const flag = asObject(value, where);

  const clauseType = asText(flag.clauseType, `${where}'s clause type`);
  if (!isClauseType(clauseType)) refuse(`${where} is about "${clauseType}", which Redline does not flag`);

  // `docs/adr/0001`, on the way out as well as on the way in. The stored text is the text
  // the Signer will search, so a quote that is no longer a sentence of it is not a citation
  // any more, whatever it was when it was saved.
  const sourceSentence = verifier.verified(asText(flag.sourceSentence, `${where}'s citation`));
  if (sourceSentence === null) {
    refuse(`${where} quotes a sentence that is not in the document it was saved with`);
  }

  const severity = asSeverity(flag.severity, where);
  const allowed: readonly string[] = SEVERITY_PROPERTIES[clauseType];

  const unstatedProperties = asArray(flag.unstatedProperties, `${where}'s unstated properties`)
    .map((property, index) => asText(property, `${where}'s unstated property ${index + 1}`))
    .map((property) => {
      if (!allowed.includes(property)) {
        refuse(`${where} says "${property}" was unstated, which is not something a ${clauseType} is judged on`);
      }
      return property;
    });

  // `docs/adr/0006`'s invariant, checked rather than recomputed. Recomputing it would make
  // a row that disagreed with itself look consistent, and a hedge that had gone missing is
  // exactly the kind of damage worth refusing to draw.
  const hedged = asBoolean(flag.hedged, `${where}'s hedge`);
  if (hedged !== unstatedProperties.length > 0) {
    refuse(`${where} is stored as ${hedged ? "hedged" : "unhedged"} with ${unstatedProperties.length} properties unstated`);
  }

  const hedgeNote = flag.hedgeNote === null ? null : asText(flag.hedgeNote, `${where}'s hedge note`);
  if (hedged !== (hedgeNote !== null)) {
    refuse(`${where} ${hedged ? "hedges without saying what is missing" : "carries a hedge note without hedging"}`);
  }

  const built = {
    id: asText(flag.id, `${where}'s id`),
    clauseType,
    sourceSentence,
    severity,
    title: asText(flag.title, `${where}'s title`),
    cost: asText(flag.cost, `${where}'s cost`),
    redLinesCrossed: readCrossings(flag.redLinesCrossed, where),
    properties: readProperties(flag.properties, allowed, where),
    unstatedProperties,
    hedged,
    hedgeNote,
    counterOffer: readCounterOffer(flag.counterOffer, sourceSentence, where),
  };

  // The one narrowing in this file, and the checks above are what pay for it: `clauseType`
  // is one of the eight, and `properties` and `unstatedProperties` have both been checked
  // against that clause type's own list. That is the correspondence `RiskFlag` expresses,
  // established by reading the row rather than assumed about it.
  return built as unknown as RiskFlag;
}

/** The Signer's own lines a stored flag met (`docs/adr/0009`), in their own words. */
function readCrossings(value: unknown, where: string): RedLineCrossing[] {
  return asArray(value, `${where}'s red lines crossed`).map((crossing, index) => {
    const crossed = asObject(crossing, `${where}'s crossing ${index + 1}`);
    return {
      redLine: asText(crossed.redLine, `${where}'s crossing ${index + 1}`),
      note: asText(crossed.note, `${where}'s crossing ${index + 1} note`),
    };
  });
}

/** What the document stated, kept to the properties this clause type is judged on. */
function readProperties(
  value: unknown,
  allowed: readonly string[],
  where: string
): Record<string, PropertyValue> {
  const stated = asObject(value, `${where}'s properties`);
  const properties: Record<string, PropertyValue> = {};

  for (const [name, property] of Object.entries(stated)) {
    if (!allowed.includes(name)) {
      refuse(`${where} states "${name}", which is not something its clause type is judged on`);
    }
    if (typeof property !== "string" && typeof property !== "number" && typeof property !== "boolean") {
      refuse(`${where} stores "${name}" as something other than a value the document stated`);
    }
    properties[name] = property;
  }
  return properties;
}

/**
 * The wording to send back, with the structural tie to the clause it replaces intact.
 *
 * `lib/analysis/result.ts` makes the reference structural rather than implied: the message
 * carries the replaced sentence and the replacement verbatim. A stored offer that no longer
 * does is a message a Signer would paste into a reply to their client, so it is refused
 * rather than shown.
 */
function readCounterOffer(value: unknown, sourceSentence: string, where: string): CounterOffer | null {
  if (value === null || value === undefined) return null;

  const offer = asObject(value, `${where}'s counter-offer`);
  const replaces = asText(offer.replaces, `${where}'s counter-offer's replaced sentence`);
  const replacement = asText(offer.replacement, `${where}'s counter-offer's replacement`);
  const text = asText(offer.text, `${where}'s counter-offer`);

  if (replaces !== sourceSentence) {
    refuse(`${where}'s counter-offer replaces a different sentence from the one the flag cites`);
  }
  if (!text.includes(replaces) || !text.includes(replacement)) {
    refuse(`${where}'s counter-offer does not carry both the old wording and the new one`);
  }
  return { replaces, replacement, text };
}

function asObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    refuse(`${where} is not there`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) refuse(`${where} is not a list`);
  return value;
}

function asText(value: unknown, where: string): string {
  if (typeof value !== "string") refuse(`${where} is not written down`);
  return value;
}

function asBoolean(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") refuse(`${where} is neither true nor false`);
  return value;
}

/** Severity is an integer 1-4 and `DESIGN.md`'s meter has four cells (`lib/analysis/result.ts`). */
function asSeverity(value: unknown, where: string): Severity {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  refuse(`${where}'s severity is not one of the four`);
}

function isChecklistEntry(name: string): name is ChecklistEntry {
  return (CHECKLIST_ENTRIES as readonly string[]).includes(name);
}

function isClauseType(name: string): name is ClauseType {
  return (SETTLED_CLAUSE_TYPES as readonly string[]).includes(name);
}
