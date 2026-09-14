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
 * **A property that does not state a bound is not bounded.** Several properties arrive as
 * the contract's own prose — "anywhere in the United Kingdom", "any claim connected with
 * the Services, whether or not the Contractor caused it" — because a scope or a trigger
 * is a phrase, not a number. Rather than guess at meaning, the predicates below look for
 * a stated limit and treat everything else as unlimited, and a phrase that takes its own
 * limit back counts as no limit at all. That is the same bias as the rule above: wording
 * Redline cannot read as narrow is marked as wide.
 *
 * **Severity is capped by clause type at the top, not at the bottom.** Subjective
 * payment approval reaches 4 and nothing else does, because it withholds money already
 * earned (`PRD.md` §5). What varies within a clause type is how far up it goes, which is
 * the distinction `docs/adr/0003` exists to make. For two clause types — the indemnity
 * and the unilateral change — how far up depends on *which* property fired rather than
 * on whether any did, because one-sidedness alone and a power over the fee are not the
 * same finding (`docs/adr/0008`).
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
    case "one-sided-indemnity": {
      const { mutual, triggeringClaims, cappedByLiabilityLimit } = reading.properties;
      const triggers: string[] = [];
      if (!statedAsYes(mutual)) triggers.push("mutual");
      if (reachesPastOwnFault(triggeringClaims)) triggers.push("triggeringClaims");
      if (!statedAsYes(cappedByLiabilityLimit)) triggers.push("cappedByLiabilityLimit");
      return triggers;
    }
    case "uncapped-liability": {
      const { liabilityCap, capAppliesToSigner, capProportionateToFee } = reading.properties;
      const triggers: string[] = [];
      if (capIsAbsent(liabilityCap)) triggers.push("liabilityCap");
      if (!statedAsYes(capAppliesToSigner)) triggers.push("capAppliesToSigner");
      if (!statedAsYes(capProportionateToFee)) triggers.push("capProportionateToFee");
      return triggers;
    }
    case "auto-renewal": {
      const { renewalTermMonths, noticeWindowDays, terminableDuringRenewal } =
        reading.properties;
      const triggers: string[] = [];
      if (renewalTermIsLong(renewalTermMonths)) triggers.push("renewalTermMonths");
      if (noticeWindowIsEarly(noticeWindowDays)) triggers.push("noticeWindowDays");
      if (!statedAsYes(terminableDuringRenewal)) triggers.push("terminableDuringRenewal");
      return triggers;
    }
    case "unilateral-change": {
      const { changeRequiresSignerAgreement, whatMayChange, exitOnChange } =
        reading.properties;
      // The one place a property gates the rest of its own clause type. A change that
      // takes effect only once the Signer signs for it is a change-order clause, which
      // is what a fair contract has; what the clause lists as changeable and whether
      // there is a way out are then answers to a question nobody is being asked. Reading
      // those two at their dangerous end still lands here, so `docs/adr/0006` holds: the
      // gap is read at its worst and the worst is still nothing to raise.
      if (statedAsYes(changeRequiresSignerAgreement)) return [];
      const triggers: string[] = ["changeRequiresSignerAgreement"];
      if (reachesMoneyOrWork(whatMayChange)) triggers.push("whatMayChange");
      if (!statedAsYes(exitOnChange)) triggers.push("exitOnChange");
      return triggers;
    }
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
 *
 * The four `docs/adr/0008` settles sit against those, and two of them read *which*
 * property fired rather than only whether one did:
 *
 * - **one-sided-indemnity, 3 or 2.** 3 when the promise reaches past trouble the Signer
 *   caused, or when it is carved out of the liability ceiling — either one turns a fee
 *   into an open-ended debt. 2 when the promise is confined to the Signer's own fault
 *   and held inside the ceiling but still runs only one way: worth knowing, not
 *   alarming, and flagging it at 3 would cry wolf on the ordinary freelance indemnity.
 * - **uncapped-liability, 3.** No ceiling, a ceiling that protects only the Sender, or a
 *   figure with no relation to what the job pays. Alongside IP overreach rather than
 *   above it: it is a contingent exposure, where subjective payment approval is a
 *   certainty about money already handed over.
 * - **auto-renewal, 2.** A renewal that commits more than half a year, a notice window
 *   that makes the Signer decide long before the end, or a renewed term they cannot
 *   leave. Beside termination for convenience, and for the mirror-image reason: both
 *   cost future income rather than earned money — one by ending the work, this one by
 *   holding the Signer to terms they would have renegotiated.
 * - **unilateral-change, 3 or 2.** 3 when what the Sender may change on its own reaches
 *   the money or the work itself, because that is the bargain being rewritten after it
 *   was struck. 2 when the power exists but reaches only operating detail. 1 when a
 *   change needs the Signer's signature, which is what a change-order clause is.
 */
export function deriveSeverity(reading: ClauseReading): Severity {
  const triggers = severityTriggers(reading);
  if (triggers.length === 0) return 1;
  const fired = new Set(triggers);

  switch (reading.clauseType) {
    case "payment-approval":
      return 4;
    case "ip-assignment":
    case "non-compete":
    case "uncapped-liability":
      return 3;
    case "termination-for-convenience":
    case "auto-renewal":
      return 2;
    case "one-sided-indemnity":
      return fired.has("triggeringClaims") || fired.has("cappedByLiabilityLimit") ? 3 : 2;
    case "unilateral-change":
      return fired.has("whatMayChange") ? 3 : 2;
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
  const months = numberIn(value);
  return months === null || months > 12;
}

function numberIn(value: PropertyValue | undefined): number | null {
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

/**
 * Whether the contract said yes to a protection the Signer would want.
 *
 * Every property it is used on is phrased so that yes is the safe answer — the indemnity
 * runs both ways, the ceiling covers the Signer, the renewed term can be left, a change
 * needs their signature — so silence answers no and the caller reads that as a trigger.
 * That is the file's first rule applied to a boolean: the gap goes against the Signer.
 */
function statedAsYes(value: PropertyValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return AFFIRMED.has(normalise(value));
}

const AFFIRMED = new Set(["true", "yes", "y", "both", "mutual", "capped", "applies"]);

/**
 * Whether an indemnity fires on more than trouble the Signer caused.
 *
 * Confinement to their own fault is the claim that has to be earned, and a phrase that
 * takes the confinement back wins over one that states it: "to the extent that the claim
 * arises from the Contractor's breach, whether or not the Contractor caused the loss"
 * is not a confinement. Silence, and a phrase Redline cannot read as confined, are both
 * read as reaching further.
 */
function reachesPastOwnFault(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  const text = String(value).toLowerCase();
  if (FAULT_IRRELEVANT.test(text)) return true;
  return !CONFINED_TO_FAULT.test(text);
}

/** Phrases that cut the Signer's own fault out of the question, whatever else is said. */
const FAULT_IRRELEVANT =
  /\b(whether or not|regardless of|irrespective of|without regard to|howsoever caused|however caused|not caused by)\b/;

/** Phrases that tie the promise to something the Signer actually did. */
const CONFINED_TO_FAULT =
  /\b(to the extent|own breach|own negligence|own default|own act|own acts|own fault|own wilful|own wrongful|its own|their own|caused by the contractor|caused by the signer|arising from the contractor's)\b/;

/**
 * Whether there is a real ceiling on what the Signer could be made to pay.
 *
 * Absent is the reading for silence and for a phrase that names no figure and no
 * measure. A ceiling stated as a sum, or tied to the fees, is a ceiling; "unlimited",
 * "no cap" and "all losses" are the contract saying in words that there is none.
 */
function capIsAbsent(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return !(value > 0);
  const text = String(value).toLowerCase();
  if (NO_CEILING.test(text)) return true;
  return ABSENT_CAPS.has(normalise(value));
}

const NO_CEILING =
  /\b(unlimited|uncapped|no limit|no cap|no ceiling|without limit|not limited|all losses|any and all)\b/;

const ABSENT_CAPS = new Set(["absent", "none", "no", "nothing", "false", "nil", "zero", "0"]);

/**
 * Whether each renewal commits the Signer for longer than half a year.
 *
 * Six months is a calibration choice, not a finding — `docs/adr/0008` says so plainly
 * and records that no evidence in `PRD.md` §8 sets a number here. A term Redline cannot
 * read as a length is read as long, the same way an unreadable scope is read as wide.
 */
function renewalTermIsLong(value: PropertyValue | undefined): boolean {
  const months = numberIn(value);
  return months === null || months > 6;
}

/**
 * Whether the Signer has to decide more than a month before the renewal date.
 *
 * The trap this looks for is the long window, not the short one: a contract demanding
 * ninety days' notice makes the decision come round a quarter before the term ends, when
 * nobody is thinking about it. Thirty days is the calibration, and it is a choice rather
 * than an observation (`docs/adr/0008`).
 */
function noticeWindowIsEarly(value: PropertyValue | undefined): boolean {
  const days = numberIn(value);
  return days === null || days > 30;
}

/**
 * Whether the Sender's power to change things reaches the money or the work.
 *
 * A power confined to operating detail — where invoices are sent, which brand guide
 * applies — is not the bargain being rewritten. One that reaches the fee, the rate or
 * the scope is. Silence, and a phrase Redline cannot read, are read as reaching.
 */
function reachesMoneyOrWork(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  return MONEY_OR_WORK.test(String(value).toLowerCase());
}

const MONEY_OR_WORK =
  /\b(fee|fees|rate|rates|price|prices|pricing|charge|charges|payment|payments|scope|service|services|deliverable|deliverables|work|term|terms|hours|retainer)\b/;

/** Whether anything is payable when the Sender ends the engagement early. */
function killFeeIsAbsent(value: PropertyValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return !(value > 0);
  const text = normalise(value);
  if (ABSENT_KILL_FEES.has(text)) return true;
  const amount = numberIn(value);
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
