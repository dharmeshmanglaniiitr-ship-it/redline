/**
 * Severity, derived from what a clause says.
 *
 * This is the whole of `docs/adr/0003` in one pure function. The model's job ends at
 * reading properties out of the text; deciding what those properties are worth happens
 * here, in code, with no network and no prompt involved. A model is never asked for a
 * severity number, because a number it made up cannot be argued with, cannot be tested,
 * and cannot be shown to a Signer as anything but an opinion. `deriveSeverity` can be
 * read, unit-tested and disagreed with.
 *
 * Three rules run through everything below.
 *
 * **An unstated property is read at its dangerous end.** Every predicate here answers
 * `true` — the dangerous answer — when the value is missing. `docs/adr/0004` prefers
 * over-flagging, and `docs/adr/0006` requires that a hedge never lowers severity, so the
 * gap has to push the finding up rather than let it off. The hedge then names what was
 * missing (`lib/analysis/wording.ts`); it does not soften the mark.
 *
 * **A property that does not state a bound is not bounded.** Two of the non-compete's
 * four properties arrive as the contract's own prose — "anywhere in the United Kingdom",
 * "within ten miles of the Client's office at Gadsby Street" — because a scope is a
 * phrase, not a number. Rather than guess at meaning, `scopeIsBroad` looks for a stated
 * limit and treats everything else as broad. That is the same bias as the rule above: a
 * scope Redline cannot read as narrow is marked as wide.
 *
 * **Severity is capped by clause type at the top, not at the bottom.** Subjective
 * payment approval reaches 4 and nothing else does, because it withholds money already
 * earned (`PRD.md` §5). What varies within a clause type is how far up it goes, which is
 * the distinction `docs/adr/0003` exists to make.
 */

import {
  SEVERITY_PROPERTIES,
  type ClauseType,
  type PropertyValue,
  type SeverityProperty,
} from "./clauses";
import type { Severity } from "./result";

/** The severity-determining properties a document actually stated, and their values. */
export type StatedProperties<T extends ClauseType> = Readonly<
  Partial<Record<SeverityProperty<T>, PropertyValue>>
>;

/**
 * One clause as the extraction read it: its type, and the properties the document
 * states. What it leaves out is as load-bearing as what it carries — `unstatedPropertiesOf`
 * computes the gap rather than taking a model's word for it.
 */
export type ClauseReading = {
  [T in ClauseType]: {
    readonly clauseType: T;
    readonly properties: StatedProperties<T>;
  };
}[ClauseType];

/**
 * The properties this clause type's severity function consumes that the document did not
 * state (`docs/adr/0006`).
 *
 * Derived from the properties themselves rather than reported alongside them, so the
 * invariant `hedged === (unstatedProperties.length > 0)` holds by construction: there is
 * no second list that could disagree with the first.
 */
export function unstatedPropertiesOf<T extends ClauseType>(
  clauseType: T,
  properties: StatedProperties<T>
): readonly SeverityProperty<T>[] {
  const consumed: readonly SeverityProperty<T>[] = SEVERITY_PROPERTIES[clauseType];
  return consumed.filter((name) => properties[name] === undefined);
}

/**
 * The properties that pushed this clause up: every one whose value is at its dangerous
 * end, or that the document never stated.
 *
 * Exported because the cost explanation is written from it (`lib/analysis/wording.ts`).
 * A Signer is told which part of the clause is the expensive part, not just a number.
 */
export function severityTriggers(reading: ClauseReading): readonly string[] {
  switch (reading.clauseType) {
    case "payment-approval":
      return acceptanceIsSubjective(reading.properties.acceptanceStandard)
        ? ["acceptanceStandard"]
        : [];
    case "ip-assignment":
      return reachesBeyondDeliverable(reading.properties.reachesBeyondDeliverable)
        ? ["reachesBeyondDeliverable"]
        : [];
    case "non-compete": {
      const { durationMonths, geographicScope, industryScope, compensated } =
        reading.properties;
      const triggers: string[] = [];
      if (durationIsLong(durationMonths)) triggers.push("durationMonths");
      if (scopeIsBroad(geographicScope)) triggers.push("geographicScope");
      if (scopeIsBroad(industryScope)) triggers.push("industryScope");
      if (!isCompensated(compensated)) triggers.push("compensated");
      return triggers;
    }
    case "termination-for-convenience":
      return killFeeIsAbsent(reading.properties.killFee) ? ["killFee"] : [];
  }
}

/**
 * What this clause is worth on `DESIGN.md`'s four-step meter.
 *
 * The four orderings are `PRD.md` §5's, and the reasoning behind each is its own:
 *
 * - **payment-approval, 4.** Acceptance left to the Sender's satisfaction with no test
 *   they have to apply. The highest step in the product, because it withholds money
 *   already earned rather than income not yet booked. An acceptance standard the
 *   contract actually defines is flagged at 1 and read rather than feared.
 * - **ip-assignment, 3.** An assignment that reaches past the engagement's deliverable —
 *   pre-existing tools and methods, or future and unrelated work. One bounded to the
 *   deliverable is 1: that is what nearly every legitimate freelance contract says, and
 *   marking it high is the crying-wolf failure `docs/adr/0003` exists to prevent.
 * - **non-compete, 3.** Long, industry-wide, geographically broad or uncompensated —
 *   any one of them. Short, narrow and paid for is 1. Judged on what it restricts, never
 *   on the fact that it exists. Whether it could be enforced is a separate, jurisdiction-
 *   dependent question this function does not touch (`docs/adr/0005`, `docs/adr/0007`).
 * - **termination-for-convenience, 2.** No kill fee. Flagged, but under the threats to
 *   money already earned: it costs expected future income (user story 12).
 */
export function deriveSeverity(reading: ClauseReading): Severity {
  const triggered = severityTriggers(reading).length > 0;
  if (!triggered) return 1;

  switch (reading.clauseType) {
    case "payment-approval":
      return 4;
    case "ip-assignment":
    case "non-compete":
      return 3;
    case "termination-for-convenience":
      return 2;
  }
}

/**
 * Whether acceptance is left to the Sender's judgment.
 *
 * Objective is the claim that has to be earned. A contract is read as setting a real
 * standard only when the extraction says so in as many words; anything else, including
 * silence, is read as the Sender's own satisfaction.
 */
function acceptanceIsSubjective(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  return !OBJECTIVE_STANDARDS.has(normalise(value));
}

const OBJECTIVE_STANDARDS = new Set([
  "objective",
  "defined",
  "written",
  "measurable",
  "specified",
  "documented",
]);

/** Whether the assignment reaches past what the Signer was engaged to make. */
function reachesBeyondDeliverable(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  return !BOUNDED_ASSIGNMENTS.has(normalise(value));
}

const BOUNDED_ASSIGNMENTS = new Set([
  "false",
  "no",
  "bounded",
  "limited",
  "deliverable",
  "deliverables",
  "deliverable only",
]);

/**
 * Whether the restriction outlasts the rough 6-12 month window `PRD.md` §5 draws. Twelve
 * months sits at the top of that window rather than past it, so twelve alone is not a
 * trigger — a twelve-month restriction still reaches 3 on its scope or its lack of pay,
 * which is what the hedging pair shows.
 */
function durationIsLong(value: PropertyValue | undefined): boolean {
  const months = asMonths(value);
  return months === null || months > 12;
}

function asMonths(value: PropertyValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const digits = /-?\d+(?:\.\d+)?/.exec(value);
    return digits === null ? null : Number(digits[0]);
  }
  return null;
}

/**
 * Whether a scope is wide.
 *
 * Narrow has to be stated. A phrase that names a measured limit — a radius, a named
 * office, a single service, an explicit "only" — is read as bounded; everything else,
 * including a phrase Redline cannot parse and a property the contract never supplied, is
 * read as broad. A widening word anywhere in the phrase wins over a bound, because
 * "within any sector" is not a limit.
 */
function scopeIsBroad(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  const text = String(value).toLowerCase();
  if (WIDENING.test(text)) return true;
  return !BOUNDING.test(text);
}

/** Words that open a scope back up, whatever else the phrase says. */
const WIDENING =
  /\b(any|all|every|anywhere|everywhere|worldwide|global|globally|nationwide|sector|sectors|industry|industries|entire|whole|unrestricted|unlimited)\b/;

/** Words that state a real limit: a measured distance, a named place, a single service. */
const BOUNDING =
  /\b(only|solely|limited to|confined to|restricted to|no further than|no more than|within|radius|mile|miles|km|kilometre|kilometres|kilometer|kilometers|postcode|zip code|single|one)\b/;

/** Whether the Signer is paid separately for accepting the restriction. */
function isCompensated(value: PropertyValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return COMPENSATED.has(normalise(value));
}

const COMPENSATED = new Set(["true", "yes", "paid", "compensated", "separately paid"]);

/** Whether anything is payable when the Sender ends the engagement early. */
function killFeeIsAbsent(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return !(value > 0);
  const text = normalise(value);
  if (ABSENT_KILL_FEES.has(text)) return true;
  const amount = asMonths(value);
  return amount !== null && amount <= 0;
}

const ABSENT_KILL_FEES = new Set([
  "absent",
  "none",
  "no",
  "nothing",
  "false",
  "not payable",
  "nil",
  "zero",
  "0",
]);

/** Lower-case, trimmed, with surrounding punctuation dropped, for comparing to a word. */
function normalise(value: PropertyValue): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
