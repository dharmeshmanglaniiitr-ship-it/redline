/**
 * One clause reading per clause type, at each end of that clause type's own threshold.
 *
 * The fixture corpus reaches most of the arms in `lib/analysis/wording.ts` and
 * `lib/analysis/counter-offer.ts` but not all of them: no fixture plants a
 * payment-approval clause with a stated test, or a termination clause with a kill fee.
 * Driving the wording functions from these two tables covers the arms a Signer's own
 * contract would reach and the corpus does not.
 *
 * Both tables are keyed by position against `SETTLED_CLAUSE_TYPES` and every test that
 * uses them asserts that, so a clause type added without a reading at each end fails
 * rather than going quietly unread.
 */

import type { ClauseReading } from "@/lib/analysis/severity";

/** Nothing stated, so every property is read at its dangerous end and every trigger fires. */
export const AT_ITS_WORST: readonly ClauseReading[] = [
  { clauseType: "payment-approval", properties: {} },
  { clauseType: "ip-assignment", properties: {} },
  { clauseType: "non-compete", properties: {} },
  { clauseType: "termination-for-convenience", properties: {} },
  { clauseType: "one-sided-indemnity", properties: {} },
  { clauseType: "uncapped-liability", properties: {} },
  { clauseType: "auto-renewal", properties: {} },
  { clauseType: "unilateral-change", properties: {} },
];

/** Every property stated at the standard end, so nothing fires. */
export const AT_ITS_BEST: readonly ClauseReading[] = [
  { clauseType: "payment-approval", properties: { acceptanceStandard: "objective" } },
  { clauseType: "ip-assignment", properties: { reachesBeyondDeliverable: false } },
  {
    clauseType: "non-compete",
    properties: {
      durationMonths: 3,
      geographicScope: "within ten miles of the Client's office",
      industryScope: "bookkeeping services only",
      compensated: true,
    },
  },
  {
    clauseType: "termination-for-convenience",
    properties: { killFee: "25 per cent of the fees for the work not yet started" },
  },
  {
    clauseType: "one-sided-indemnity",
    properties: {
      mutual: true,
      triggeringClaims: "a claim to the extent that it arises from that party's own breach",
      cappedByLiabilityLimit: true,
    },
  },
  {
    clauseType: "uncapped-liability",
    properties: {
      liabilityCap: "the total fees payable under this Agreement",
      capAppliesToSigner: true,
      capProportionateToFee: true,
    },
  },
  {
    clauseType: "auto-renewal",
    properties: { renewalTermMonths: 1, noticeWindowDays: 14, terminableDuringRenewal: true },
  },
  {
    clauseType: "unilateral-change",
    properties: {
      changeRequiresSignerAgreement: true,
      whatMayChange: "the monthly fee, by signed variation only",
      exitOnChange: true,
    },
  },
];

/**
 * A reading with one property stated and the rest left out, per clause type.
 *
 * The middle of the range, where a trigger fires on something the contract *said* rather
 * than on silence. `lib/analysis/wording.ts` writes a different sentence for each of those
 * two cases, so a table with only the two extremes in it would leave half the arms unread.
 */
export const HALF_STATED: readonly ClauseReading[] = [
  { clauseType: "payment-approval", properties: { acceptanceStandard: "subjective" } },
  { clauseType: "ip-assignment", properties: { reachesBeyondDeliverable: true } },
  {
    clauseType: "non-compete",
    properties: {
      durationMonths: 24,
      geographicScope: "anywhere in the world",
      industryScope: "any business similar to the Client's",
      compensated: false,
    },
  },
  { clauseType: "termination-for-convenience", properties: { killFee: "absent" } },
  {
    clauseType: "one-sided-indemnity",
    properties: {
      mutual: false,
      triggeringClaims: "any claim arising out of this Agreement",
      cappedByLiabilityLimit: false,
    },
  },
  {
    clauseType: "uncapped-liability",
    properties: {
      liabilityCap: "five times the total fees payable under this Agreement",
      capAppliesToSigner: false,
      capProportionateToFee: false,
    },
  },
  {
    clauseType: "auto-renewal",
    properties: { renewalTermMonths: 12, noticeWindowDays: 90, terminableDuringRenewal: false },
  },
  {
    clauseType: "unilateral-change",
    properties: {
      changeRequiresSignerAgreement: false,
      whatMayChange: "the fees, the scope and the schedule",
      exitOnChange: false,
    },
  },
];

/** Every reading in this module, for a test that wants the whole range at once. */
export const EVERY_READING: readonly ClauseReading[] = [
  ...AT_ITS_WORST,
  ...HALF_STATED,
  ...AT_ITS_BEST,
];
