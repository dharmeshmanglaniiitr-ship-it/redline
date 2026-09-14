/**
 * What `analyze()` returns, and the shape every later analysis capability comes back in.
 *
 * Flags, the checked-clean list, counter-offers and the Signer's red lines all return
 * through this one result (`docs/spec-v1.md`, Implementation Decisions), so the fields
 * are here from the start even where nothing populates them yet. An empty array is a
 * real answer — the analysis looked and has nothing to report — which is why nothing in
 * this file is optional: a caller reading `flags` gets a list, never `undefined`, and a
 * later ticket fills it rather than changing its shape.
 *
 * Three rules are enforced by the types rather than remembered:
 *
 * - **A flag without its source sentence cannot be written down** (`docs/adr/0001`).
 *   `sourceSentence` is a required string, so an unsourced flag is unrepresentable.
 * - **A hedge can only name a property its clause type's severity function consumes**
 *   (`docs/adr/0006`). `unstatedProperties` is typed to that clause type's properties.
 * - **Jurisdiction is never silently defaulted** (`docs/adr/0007`). Undetermined is one
 *   arm of a union, not an empty string, and a detection carries the sentence it came
 *   from or it is not a detection.
 * - **A flagged clause cannot also be reported clean** (`docs/adr/0004`). `checkedClean`
 *   is a `ClearedChecklist`, and the only way to obtain one is `clearedList`, which
 *   reads the flags (`lib/analysis/checklist.ts`).
 */

import type { ClearedChecklist } from "./checklist";
import type { ClauseType, PropertyValue, SeverityProperty } from "./clauses";

/**
 * Severity is an integer 1-4, because `DESIGN.md`'s meter is four cells and announces
 * "severity, N of 4". 4 is subjective payment approval, 3 IP reaching beyond the
 * deliverable and a long/broad/uncompensated restriction, 2 termination for convenience
 * with no kill fee, 1 present but standard.
 */
export type Severity = 1 | 2 | 3 | 4;

/** The governing-law clause a jurisdiction was read out of, quoted (`docs/adr/0007`). */
export interface JurisdictionDetection {
  readonly name: string;
  /** Verbatim, as every other claim in this product is. */
  readonly sourceSentence: string;
}

/**
 * The law the analysis worked under.
 *
 * Detected from the document, overridden by the Signer, or undetermined — in that
 * precedence and never defaulted to US (`docs/adr/0007`). The Signer's arm carries the
 * detection it overrode, because a governing-law clause naming a forum far from where
 * the Signer works is a real feature of the deal and both get shown.
 */
export type Jurisdiction =
  | { readonly source: "undetermined" }
  | { readonly source: "document"; readonly name: string; readonly sourceSentence: string }
  | {
      readonly source: "signer";
      readonly name: string;
      readonly detected: JurisdictionDetection | null;
    };

/** Nothing in the document named a governing law and the Signer has not said. */
export const UNDETERMINED_JURISDICTION: Jurisdiction = { source: "undetermined" };

/** The jurisdiction the analysis assumed, or null when there is genuinely none. */
export function assumedJurisdictionName(jurisdiction: Jurisdiction): string | null {
  return jurisdiction.source === "undetermined" ? null : jurisdiction.name;
}

/**
 * One line a Signer will not cross, in their own words. Red lines are an input to the
 * analysis rather than a filter over its output (`docs/spec-v1.md`), and ticket 13 makes
 * them editable and persistent.
 */
export interface RedLine {
  readonly text: string;
}

/**
 * One of the Signer's own red lines that a flagged clause meets (`docs/adr/0009`).
 *
 * This is the second reading of a clause and it is kept apart from the first. `severity`
 * says what the wording does to anybody, derived from the clause's own properties
 * (`docs/adr/0003`) and unmoved by who is reading or under whose law (`docs/adr/0007`).
 * A crossing says this particular Signer wrote down that they will not accept it. Two
 * different claims, so two different fields — and a crossing is what moves a flag up the
 * list, never what moves its mark.
 */
export interface RedLineCrossing {
  /** The Signer's own words, verbatim, so they recognise the line they wrote. */
  readonly redLine: string;
  /** Why this clause meets that line. Written in code, never by a model. */
  readonly note: string;
}

/**
 * The plain-English account of what signing would commit the Signer to (user story 4),
 * naming who sent it and what it covers so they can tell they are looking at the right
 * document (user story 5).
 */
export interface DocumentSummary {
  /** The Sender, named as the document names them. */
  readonly sender: string;
  /** The engagement the contract covers, in one line. */
  readonly engagement: string;
  /** What it commits the Signer to. Blank lines separate paragraphs. */
  readonly plainEnglish: string;
}

/**
 * Wording the Signer can send back, and the clause language it replaces (user story 17).
 *
 * Three fields rather than one, because the reference to the replaced language has to be
 * structural rather than implied in prose. `replaces` is the flag's own verified citation
 * and `replacement` is the contract wording asked for in its place; `text` is the whole
 * message, and it contains both of them verbatim, so the record and the thing the Sender
 * actually receives cannot come apart (`lib/analysis/counter-offer.ts`).
 */
export interface CounterOffer {
  /** The sentence being replaced — the flag's own citation, unchanged. */
  readonly replaces: string;
  /** The contract wording asked for in its place, on its own. */
  readonly replacement: string;
  /** The whole message, sendable as it stands, carrying both of the above verbatim. */
  readonly text: string;
}

/**
 * One flagged clause, as its own clause type sees it.
 *
 * Generic so that `properties` and `unstatedProperties` are that clause type's
 * properties and no others: a payment-approval flag cannot claim a non-compete's
 * duration was unstated, because the name does not exist on this type.
 */
interface FlagOfClause<T extends ClauseType> {
  /** Stable handle for this flag within its document, e.g. "payment-subjective". */
  readonly id: string;
  readonly clauseType: T;
  /** The sentence this came from, verbatim (`docs/adr/0001`). Required, never null. */
  readonly sourceSentence: string;
  readonly severity: Severity;
  /** What to call it in the margin and the ranked index (`DESIGN.md`). */
  readonly title: string;
  /** What it would cost the Signer, in their terms (user story 8). */
  readonly cost: string;
  /**
   * The Signer's own red lines this clause meets (`docs/adr/0009`). Empty for a Signer
   * who has recorded none, and empty on every clause their lines say nothing about.
   * Crossing a line moves a flag up the ranked list; it never moves `severity`.
   */
  readonly redLinesCrossed: readonly RedLineCrossing[];
  /** The severity-determining properties the document states, and their values. */
  readonly properties: Readonly<Partial<Record<SeverityProperty<T>, PropertyValue>>>;
  /** The ones it is silent on. A hedge names these and nothing else (`docs/adr/0006`). */
  readonly unstatedProperties: readonly SeverityProperty<T>[];
  /** Always `unstatedProperties.length > 0`; carried so the invariant is assertable. */
  readonly hedged: boolean;
  /** The hedge itself, naming what is missing. Null exactly when `hedged` is false. */
  readonly hedgeNote: string | null;
  /**
   * The wording to send back. Null only where none was drafted — never a placeholder,
   * because a fake redraft is a thing a Signer would paste into a reply to their client.
   * Every flag `analyze()` returns carries a real one (`lib/analysis/counter-offer.ts`).
   */
  readonly counterOffer: CounterOffer | null;
}

/** A flagged clause. The union over clause types keeps each one's properties its own. */
export type RiskFlag = { [T in ClauseType]: FlagOfClause<T> }[ClauseType];

/**
 * Everything the analysis found in one document.
 *
 * An empty list anywhere here is the analysis
 * reporting what it has — not a stub, and not a clean bill either: the screen says which
 * of them Redline has actually looked for, because a quiet result that reads like a
 * passed contract is the most dangerous thing this product could show
 * (`docs/spec-v1.md`).
 *
 * The two lists are read together. Flags say what would cost the Signer; the cleared
 * list says what was examined and came back with nothing, so a short flag list means
 * "we looked" rather than "we found nothing" (`docs/adr/0004`).
 */
export interface AnalysisResult {
  readonly summary: DocumentSummary;
  /**
   * The Signer's own lines first, then worst first, so ten minutes spent at the top is
   * spent well (user story 6). With no red lines recorded it is worst first and nothing
   * else, which is the order every earlier ticket expects (`docs/adr/0009`).
   */
  readonly flags: readonly RiskFlag[];
  /** Checklist entries examined with nothing to report — data, not prose. */
  readonly checkedClean: ClearedChecklist;
  /** What the analysis assumed about governing law, recorded so it can be corrected. */
  readonly jurisdiction: Jurisdiction;
  /** The standard this document was marked against, kept with the marks it produced. */
  readonly redLines: readonly RedLine[];
}
