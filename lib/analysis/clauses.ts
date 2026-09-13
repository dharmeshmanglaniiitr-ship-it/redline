/**
 * The clause vocabulary the analysis is written in, and the one place it is defined.
 *
 * Three lists live here because three decisions depend on them being lists rather than
 * prose. "Checked and came back clean" is only a claim that can be true or false against
 * a real checklist (`docs/adr/0004`). Severity is a function of a clause's own
 * properties rather than its category (`docs/adr/0003`), so the properties have to be
 * enumerated per clause type. And a finding is hedged exactly when one of those
 * properties was not stated in the document (`docs/adr/0006`), so a hedge can only ever
 * name a property that appears here — which the types below enforce rather than ask for.
 *
 * The fixture corpus reads these same lists (`tests/support/fixtures.ts` re-exports
 * them), so a sidecar cannot record a property the analysis does not consume.
 */

/**
 * The clause checklist for freelance contracts. Every entry is examined; the ones that
 * came back with nothing are reported by name (`docs/adr/0004`).
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
 * (`docs/spec-v1.md`, Out of Scope), so nothing is flagged under them.
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
 * `docs/adr/0006`. Adding a clause type without its properties does not compile, which
 * is the same constraint `docs/adr/0003` imposes, made structural.
 */
export const SEVERITY_PROPERTIES = {
  "payment-approval": ["acceptanceStandard"],
  "ip-assignment": ["reachesBeyondDeliverable"],
  "non-compete": ["durationMonths", "geographicScope", "industryScope", "compensated"],
  "termination-for-convenience": ["killFee"],
} as const satisfies Record<ClauseType, readonly string[]>;

/**
 * A property name one clause type's severity function consumes. Defaulted to every
 * clause type so `SeverityProperty` alone means "any of them", while
 * `SeverityProperty<"non-compete">` is the four a non-compete is judged on and nothing
 * else.
 */
export type SeverityProperty<T extends ClauseType = ClauseType> =
  (typeof SEVERITY_PROPERTIES)[T][number];

/** What a severity-determining property is worth when the document does state it. */
export type PropertyValue = string | number | boolean;
