/**
 * The checklist examination, and the only place a cleared list can be made.
 *
 * "Checked and came back clean" is the one claim in this product that cannot be checked
 * against a citation: there is no sentence to quote for a clause that is not there, or
 * that is there and costs nothing. `docs/adr/0004` still requires it to be a real claim
 * rather than a reformulated all-clear, so what stands in for the citation is
 * provenance — an entry may be reported clean only when both halves hold:
 *
 * 1. **It was examined.** The examination accounts for every entry on the checklist
 *    (`lib/analysis/analyze.ts` refuses an answer that leaves one out), so an entry
 *    nothing looked at is never mistaken for an entry nothing was found in. This is the
 *    half `docs/spec-v1.md` names: zero flags with an empty checklist is
 *    indistinguishable from not having looked at all.
 * 2. **It produced no flag.** The flags are read here, not remembered. A clean claim the
 *    findings contradict loses, every time, without anyone having to keep the two lists
 *    in step.
 *
 * The second half is why `clearedList` takes the flags rather than trusting a caller to
 * subtract them afterwards, and why `ClearedChecklist` is branded: the field on
 * `AnalysisResult` cannot be filled with a hand-written array of entry names, because
 * the only value of that type in the codebase is the one this function returns. The
 * no-overlap invariant is therefore structural — a flagged entry cannot appear in a
 * cleared list, because no other cleared list can be built.
 */

import { CHECKLIST_ENTRIES, type ChecklistEntry } from "./clauses";
import type { RiskFlag } from "./result";

/**
 * What the examination found on one checklist entry.
 *
 * `cleared` is not "the contract is silent on this". It is "Redline read the contract on
 * this point and there is nothing for the Signer to take up" — a fair termination clause
 * with a kill fee in it clears, and so does a contract with no restrictive covenant at
 * all. A point the examination could not settle from the text does not clear: an
 * unsettled question is not the same answer as nothing to report.
 */
export interface ChecklistVerdict {
  readonly entry: ChecklistEntry;
  readonly cleared: boolean;
}

declare const derived: unique symbol;

/**
 * A cleared list that came from an examination and the flags that examination produced.
 *
 * The brand carries no data and costs nothing at runtime — the value is an ordinary
 * array of entry names, and it serialises as one across the server-action boundary. What
 * it buys is that `checkedClean` cannot be filled from anywhere but `clearedList`.
 */
export type ClearedChecklist = readonly ChecklistEntry[] & { readonly [derived]: true };

/**
 * The entries this document was examined on and came back clean.
 *
 * Returned in `CHECKLIST_ENTRIES` order rather than the order the examination happened
 * to answer in, so two runs over the same contract read the same way down the page.
 */
export function clearedList(
  examined: readonly ChecklistVerdict[],
  flags: readonly RiskFlag[]
): ClearedChecklist {
  const cleared = new Set(
    examined.filter((verdict) => verdict.cleared).map((verdict) => verdict.entry)
  );
  // Every clause type a flag can carry is a checklist entry, so a finding always has an
  // entry to contradict. Widened to strings because that is the only comparison needed.
  const flagged = new Set<string>(flags.map((flag) => flag.clauseType));

  const entries = CHECKLIST_ENTRIES.filter(
    (entry) => cleared.has(entry) && !flagged.has(entry)
  );
  // The one place the brand is applied, which is what makes it worth having: the value
  // is an ordinary array and the brand exists only in the type, so this is the single
  // point where an array of entry names becomes a list that may be reported clean.
  return entries as unknown as ClearedChecklist;
}
