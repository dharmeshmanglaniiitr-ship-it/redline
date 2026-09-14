/**
 * The shape of the worked example on the landing page.
 *
 * The page shows a contract with flags marked on it, and everything in that
 * demonstration came out of `analyze()` over a contract in `tests/fixtures/`. It is not
 * written by hand and it is not an illustration of what the analysis would say: the
 * titles, the severities, the cost explanations and the quoted sentences are the
 * product's own output, generated ahead of time by
 * `scripts/generate-landing-sample.ts` and committed as `sample-analysis.ts` beside this
 * file.
 *
 * Generated ahead of time because the landing page is prerendered and calls no model
 * (`.impeccable/surfaces/app-page-tsx.md`), and a marketing page that reached for a model
 * at request time would be a different page with a different failure mode. What keeps the
 * committed copy honest instead is `tests/landing-sample.test.ts`: it runs the analysis
 * again, compares what comes back with what is committed, and fails when they differ —
 * so a change to the analysis shows up as a failing test rather than as a landing page
 * quietly advertising last month's product.
 *
 * The types are here rather than in the generated file so that the generator is checked
 * against them by the compiler, and so a hand-edit of the generated file fails to
 * typecheck rather than reaching a reader.
 */

import type { ChecklistEntry, ClauseType } from "@/lib/analysis/clauses";
import type { Severity } from "@/lib/analysis/result";

/**
 * What produced the committed output.
 *
 * One arm today, and it is stated on the page in as many words: the analysis ran with the
 * fixture-backed stub gateway the test suite uses (`tests/support/stub-model.ts`), not
 * against the live model. Everything downstream of the gateway — the citation check, the
 * severity derivation, the wording — is the product's own, and none of it is a claim
 * about how the live model reads a contract. A future regeneration against a live model
 * is a second arm here and a different sentence on the page, not a quiet swap.
 */
export type SampleProvenance = "fixture-stub";

/** One run of the document: an ordinary stretch, or the sentence a flag came from. */
export interface SampleSpan {
  readonly text: string;
  /** The flag whose citation this run is, or null for text no flag pointed at. */
  readonly flagId: string | null;
}

/** One clause of the sample contract, as the sheet sets it. */
export interface SampleClause {
  /** The contract's own section heading above this block, where it has one. */
  readonly heading: string | null;
  /** The block's text, cut at the boundaries of the citations inside it. */
  readonly spans: readonly SampleSpan[];
  /** The flags marked in this block, in the order their sentences appear. */
  readonly flagIds: readonly string[];
}

/** One flag, carrying only the fields the landing page reads. */
export interface SampleFlag {
  readonly id: string;
  readonly clauseType: ClauseType;
  readonly severity: Severity;
  /** `severityWord(severity)`, carried so the page needs no analysis code to say it. */
  readonly severityWord: string;
  readonly title: string;
  readonly cost: string;
  /** The gap the contract left, where it left one (`docs/adr/0006`). */
  readonly hedgeNote: string | null;
  /** The clause number the citation opens with, or null where it has none. */
  readonly clauseReference: string | null;
  /** Verbatim, and checked against the sample contract on the way in (`docs/adr/0001`). */
  readonly sourceSentence: string;
}

/** One checklist entry that was examined and came back with nothing to report. */
export interface SampleCleared {
  readonly entry: ChecklistEntry;
  readonly name: string;
}

export interface LandingSample {
  /** The fixture this was read from, named on the page so nobody mistakes it for a client's. */
  readonly fixture: string;
  readonly producedBy: SampleProvenance;
  /** The law the reading was made under, and the sentence it was read from (`docs/adr/0007`). */
  readonly jurisdiction: { readonly name: string; readonly sourceSentence: string } | null;
  /** Worst first, as `analyze()` ranked them. */
  readonly flags: readonly SampleFlag[];
  /** In document order, because a proof mark ties to position and not to rank. */
  readonly clauses: readonly SampleClause[];
  readonly cleared: readonly SampleCleared[];
  /** How many entries there are to clear, so the page can say four of eight. */
  readonly checklistTotal: number;
}
