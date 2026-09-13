/**
 * Loading the fixture corpus, and the vocabulary it is written in.
 *
 * Every `.txt` contract under `tests/fixtures/` has a sidecar `.json` beside it that
 * records what was planted in it, at what severity, and which sentence it came from.
 * That sidecar is the contract between the corpus and every test that runs over it, so
 * it is validated on load rather than trusted: a sidecar naming a clause type that does
 * not exist, or a severity outside 1-4, or a property that is not one of the properties
 * its clause type's severity function consumes, fails here with the file named.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { splitIntoSentences } from "@/lib/text/sentences";

const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/", import.meta.url));

/**
 * Severity is an integer 1-4, because `DESIGN.md`'s meter is four cells and announces
 * "severity, N of 4". 4 is subjective payment approval, 3 IP reaching beyond the
 * deliverable and a long/broad/uncompensated restriction, 2 termination for convenience
 * with no kill fee, 1 present but standard.
 */
export type Severity = 1 | 2 | 3 | 4;

export const SEVERITIES: readonly Severity[] = [1, 2, 3, 4];

/**
 * The clause checklist for freelance contracts. "Checked and came back clean" is only a
 * real claim against a real list (`docs/adr/0004`), so the list is data.
 */
export const CHECKLIST_ENTRIES = [
  "payment-approval",
  "ip-assignment",
  "non-compete",
  "termination-for-convenience",
  "one-sided-indemnity",
  "uncapped-liability",
  "auto-renewal",
  "unilateral-change",
] as const;

export type ChecklistEntry = (typeof CHECKLIST_ENTRIES)[number];

/**
 * The four clause types whose dangerous-vs-standard thresholds `PRD.md` §5 settles. The
 * other four checklist entries are checked but have no settled severity rule yet
 * (`docs/spec-v1.md`, Out of Scope), so nothing in the corpus plants one.
 */
export const SETTLED_CLAUSE_TYPES = [
  "payment-approval",
  "ip-assignment",
  "non-compete",
  "termination-for-convenience",
] as const;

export type ClauseType = (typeof SETTLED_CLAUSE_TYPES)[number];

/**
 * The properties each clause type's severity function consumes, enumerated per
 * `docs/adr/0006`. A finding is hedged if and only if one of its type's properties was
 * not stated in the document, so this list is what `unstatedProperties` is checked
 * against — a hedge can only name a property that appears here.
 */
export const SEVERITY_PROPERTIES: Readonly<Record<ClauseType, readonly string[]>> = {
  "payment-approval": ["acceptanceStandard"],
  "ip-assignment": ["reachesBeyondDeliverable"],
  "non-compete": ["durationMonths", "geographicScope", "industryScope", "compensated"],
  "termination-for-convenience": ["killFee"],
};

/** One clause planted in a fixture, with the expectation tests assert against. */
export interface PlantedClause {
  /** Stable handle for this clause within its fixture, e.g. "payment-subjective". */
  readonly id: string;
  readonly clauseType: ClauseType;
  /** The citation, character for character as it appears in the `.txt` fixture. */
  readonly sourceSentence: string;
  /** The severity this clause carries if it is flagged. */
  readonly expectedSeverity: Severity;
  /**
   * Whether recall demands a flag. True for every clause planted at its dangerous
   * threshold; false where going unflagged is also a correct answer, as `PRD.md` §5
   * allows for a bounded IP assignment.
   */
  readonly mustBeFlagged: boolean;
  /** The severity-determining properties the document does state, and their values. */
  readonly properties: Readonly<Record<string, string | number | boolean>>;
  /** The severity-determining properties the document is silent on (`docs/adr/0006`). */
  readonly unstatedProperties: readonly string[];
  /** Always `unstatedProperties.length > 0`; stated separately so a sidecar can lie. */
  readonly expectedHedged: boolean;
  /** One line tracing this severity back to `PRD.md` §5. */
  readonly why: string;
}

/** The jurisdiction the document's own governing-law clause establishes, if it has one. */
export interface JurisdictionExpectation {
  /** The jurisdiction name, or "undetermined" when the document names no governing law. */
  readonly expected: string;
  /** The governing-law sentence, verbatim; null when there is none to cite. */
  readonly sourceSentence: string | null;
}

export interface Sidecar {
  readonly fixture: string;
  readonly description: string;
  /** The Sender the summary has to name (user story 5). */
  readonly sender: string;
  /** The engagement the summary has to identify (user story 5). */
  readonly engagement: string;
  readonly jurisdiction: JurisdictionExpectation;
  readonly planted: readonly PlantedClause[];
  readonly expectedCleanChecklist: readonly ChecklistEntry[];
  /** Questions this document does not answer, for the Q&A refusal case (`PRD.md` §4). */
  readonly unanswerableQuestions: readonly string[];
}

export interface Fixture {
  /** File name of the contract, e.g. "adhesion-contract.txt". */
  readonly name: string;
  /** The extracted document text, exactly as a parser would hand it to the analysis. */
  readonly text: string;
  /** The document's sentences, split the one way this repo defines a sentence. */
  readonly sentences: readonly string[];
  readonly sidecar: Sidecar;
}

/** Every contract in the corpus, discovered from disk so a new one is covered at once. */
export function fixtureNames(): readonly string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith(".txt"))
    .sort();
}

/** The two halves of each fixture pair, as [narrower, broader]. */
export const FIXTURE_PAIRS: readonly (readonly [string, string])[] = [
  ["pair-ip-bounded.txt", "pair-ip-overreaching.txt"],
  ["pair-noncompete-narrow.txt", "pair-noncompete-broad.txt"],
  ["pair-hedge-stated.txt", "pair-hedge-silent.txt"],
];

/** Load a contract and its sidecar, validating the sidecar as it goes. */
export function loadFixture(name: string): Fixture {
  const text = readFileSync(FIXTURE_DIR + name, "utf8");
  const sidecarName = name.replace(/\.txt$/, ".json");
  const raw: unknown = JSON.parse(readFileSync(FIXTURE_DIR + sidecarName, "utf8"));
  return {
    name,
    text,
    sentences: splitIntoSentences(text),
    sidecar: parseSidecar(raw, sidecarName, name),
  };
}

/** Load a binary fixture, such as the image-only PDF. */
export function loadBinaryFixture(name: string): Buffer {
  return readFileSync(FIXTURE_DIR + name);
}

function parseSidecar(raw: unknown, sidecarName: string, expectedFixture: string): Sidecar {
  const fail = (message: string): never => {
    throw new Error(`${sidecarName}: ${message}`);
  };
  const root = asRecord(raw) ?? fail("is not a JSON object");

  const fixture = asString(root.fixture) ?? fail("has no string `fixture`");
  if (fixture !== expectedFixture) {
    fail(`names fixture "${fixture}" but sits beside "${expectedFixture}"`);
  }

  const jurisdictionRaw = asRecord(root.jurisdiction) ?? fail("has no `jurisdiction`");
  const jurisdiction: JurisdictionExpectation = {
    expected: asString(jurisdictionRaw.expected) ?? fail("has no `jurisdiction.expected`"),
    sourceSentence:
      jurisdictionRaw.sourceSentence === null
        ? null
        : (asString(jurisdictionRaw.sourceSentence) ??
          fail("`jurisdiction.sourceSentence` is neither a string nor null")),
  };
  if (jurisdiction.expected === "undetermined" && jurisdiction.sourceSentence !== null) {
    fail("claims an undetermined jurisdiction while citing a governing-law sentence");
  }
  if (jurisdiction.expected !== "undetermined" && jurisdiction.sourceSentence === null) {
    fail(`names jurisdiction "${jurisdiction.expected}" without the sentence it came from`);
  }

  const plantedRaw = asArray(root.planted) ?? fail("has no `planted` array");
  const planted = plantedRaw.map((entry, index) =>
    parsePlanted(entry, (message) => fail(`planted[${index}] ${message}`))
  );

  const cleanRaw = asStringArray(root.expectedCleanChecklist) ?? fail("has no `expectedCleanChecklist`");
  const expectedCleanChecklist = cleanRaw.map((entry) =>
    isChecklistEntry(entry) ? entry : fail(`expectedCleanChecklist has unknown entry "${entry}"`)
  );
  for (const clause of planted) {
    if (expectedCleanChecklist.includes(clause.clauseType)) {
      fail(`lists "${clause.clauseType}" as clean while planting "${clause.id}" in it`);
    }
  }

  const unanswerableQuestions =
    asStringArray(root.unanswerableQuestions) ?? fail("has no `unanswerableQuestions`");
  if (unanswerableQuestions.length === 0) {
    fail("has an empty `unanswerableQuestions`, so the refusal case has nothing to run on");
  }

  return {
    fixture,
    description: asString(root.description) ?? fail("has no `description`"),
    sender: asString(root.sender) ?? fail("has no `sender`"),
    engagement: asString(root.engagement) ?? fail("has no `engagement`"),
    jurisdiction,
    planted,
    expectedCleanChecklist,
    unanswerableQuestions,
  };
}

function parsePlanted(raw: unknown, fail: (message: string) => never): PlantedClause {
  const entry = asRecord(raw) ?? fail("is not a JSON object");

  const clauseType = asString(entry.clauseType) ?? fail("has no `clauseType`");
  if (!isClauseType(clauseType)) {
    fail(`has clauseType "${clauseType}", which has no settled severity threshold`);
  }

  const severity = asNumber(entry.expectedSeverity) ?? fail("has no `expectedSeverity`");
  if (!isSeverity(severity)) {
    fail(`has expectedSeverity ${severity}, outside the 1-4 scale`);
  }

  const known = SEVERITY_PROPERTIES[clauseType];
  const properties = asRecord(entry.properties) ?? fail("has no `properties`");
  const stated: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!known.includes(key)) {
      fail(`states property "${key}", which ${clauseType} severity does not consume`);
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      fail(`gives property "${key}" a value that is not a string, number or boolean`);
    }
    stated[key] = value;
  }

  const unstatedProperties = asStringArray(entry.unstatedProperties) ?? fail("has no `unstatedProperties`");
  for (const key of unstatedProperties) {
    if (!known.includes(key)) {
      fail(`calls "${key}" unstated, but ${clauseType} severity does not consume it`);
    }
    if (key in stated) {
      fail(`lists "${key}" as both stated and unstated`);
    }
  }
  for (const key of known) {
    if (!(key in stated) && !unstatedProperties.includes(key)) {
      fail(`accounts for neither a stated nor an unstated "${key}"`);
    }
  }

  const expectedHedged = asBoolean(entry.expectedHedged) ?? fail("has no `expectedHedged`");
  const mustBeFlagged = asBoolean(entry.mustBeFlagged) ?? fail("has no `mustBeFlagged`");

  return {
    id: asString(entry.id) ?? fail("has no `id`"),
    clauseType,
    sourceSentence: asString(entry.sourceSentence) ?? fail("has no `sourceSentence`"),
    expectedSeverity: severity,
    mustBeFlagged,
    properties: stated,
    unstatedProperties,
    expectedHedged,
    why: asString(entry.why) ?? fail("has no `why`"),
  };
}

function isChecklistEntry(value: string): value is ChecklistEntry {
  return (CHECKLIST_ENTRIES as readonly string[]).includes(value);
}

function isClauseType(value: string): value is ClauseType {
  return (SETTLED_CLAUSE_TYPES as readonly string[]).includes(value);
}

function isSeverity(value: number): value is Severity {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  const array = asArray(value);
  if (array === undefined || array.some((item) => typeof item !== "string")) {
    return undefined;
  }
  return array.filter((item): item is string => typeof item === "string");
}
