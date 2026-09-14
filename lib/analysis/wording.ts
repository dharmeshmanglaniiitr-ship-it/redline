/**
 * Every word a Signer reads on a flag.
 *
 * The model reads properties out of a contract; it does not write the finding. The
 * title, the explanation of what the clause would cost, the severity word and the hedge
 * are all written here, from what the extraction found, for three reasons.
 *
 * First, `CLAUDE.md` requires that copy a Signer reads has been through the humanizer
 * skill before it ships, and prose a model invents at request time has not. Second,
 * `docs/adr/0007` names a set of claims — non-compete enforceability first among them —
 * that must always be stated relative to the governing jurisdiction and never as fact.
 * Written here, that rule is a branch in a function with the jurisdiction in hand.
 * Written in a prompt, it is a hope. Third, a hedge has to name the property the
 * document left out (`docs/adr/0006`), and the property names are identifiers —
 * `geographicScope` is not something to put in front of a person.
 *
 * Nothing in this file states anything the document did not say. Where a value is
 * missing the sentence that depends on it is left out, and the hedge says so.
 */

import type { ClauseType } from "./clauses";
import type { Jurisdiction, Severity } from "./result";
import type { ClauseReading } from "./severity";

/** The word beside `DESIGN.md`'s four-cell meter. Same ramp the landing page uses. */
const SEVERITY_WORDS: Record<Severity, string> = {
  4: "Highest",
  3: "High",
  2: "Flagged",
  1: "Noted",
};

/** What to call this step of the meter. One of severity's three channels. */
export function severityWord(severity: Severity): string {
  return SEVERITY_WORDS[severity];
}

/**
 * What each severity-determining property is called in front of a Signer.
 *
 * A hedge has to name what is missing, and "the contract does not say `compensated`"
 * names nothing. Every property a severity function consumes has a line here; a clause
 * type added without one will not compile.
 */
const PROPERTY_IN_PLAIN_WORDS: Record<string, string> = {
  acceptanceStandard: "what your work has to meet before it counts as accepted",
  reachesBeyondDeliverable: "whether it stops at what you made for this job",
  durationMonths: "how long the restriction runs",
  geographicScope: "where the restriction applies",
  industryScope: "what work the restriction covers",
  compensated: "whether you are paid anything for accepting the restriction",
  killFee: "whether anything is owed to you if they end it early",
};

/**
 * The hedge, naming the gap (`docs/adr/0006`).
 *
 * Null when the document stated everything the severity function consumed, which is the
 * ordinary case: a finding with nothing missing behind it is said plainly. A hedge never
 * lowers severity — `lib/analysis/severity.ts` has already read the gap at its dangerous
 * end — so this is a statement about the basis of the mark, not a softening of it.
 */
export function hedgeNoteFor(unstatedProperties: readonly string[]): string | null {
  if (unstatedProperties.length === 0) return null;
  const named = unstatedProperties.map(
    (property) => PROPERTY_IN_PLAIN_WORDS[property] ?? property
  );
  const gaps = named.length === 1 ? "that gap" : "those gaps";
  return `The contract does not say ${joinWithOr(named)}, so Redline has read ${gaps} the way that costs you most.`;
}

/** What to call this finding in the margin and in the ranked index. */
export function titleFor(reading: ClauseReading, triggers: readonly string[]): string {
  const marked = triggers.length > 0;
  switch (reading.clauseType) {
    case "payment-approval":
      return marked
        ? "Payment left to the client's judgment"
        : "Acceptance runs against a written test";
    case "ip-assignment":
      return marked
        ? "Ownership reaches past this job"
        : "The client owns what you built for them";
    case "non-compete":
      return marked
        ? "A block on similar work after this ends"
        : "A short block on similar work, paid for";
    case "termination-for-convenience":
      return marked
        ? "They can walk away owing nothing"
        : "They can end it early, for a fee";
  }
}

/**
 * What the clause would cost the Signer, in their terms rather than the contract's
 * (user story 8).
 *
 * Written from the properties that were read, so two contracts with the same clause type
 * and different wording do not get the same paragraph. The non-compete is the one that
 * carries a legal claim, and that claim is attributed: whether a restriction would hold
 * up is answered by a jurisdiction, and when the contract names none, the answer is that
 * nobody can say, not a guess at US law (`docs/adr/0005`, `docs/adr/0007`).
 */
export function costFor(
  reading: ClauseReading,
  triggers: readonly string[],
  jurisdiction: Jurisdiction
): string {
  const fired = new Set(triggers);

  switch (reading.clauseType) {
    case "payment-approval":
      return fired.has("acceptanceStandard")
        ? "The client decides whether your finished work is good enough, and the " +
            "contract sets no test they have to apply. They can hold back money for " +
            "work you have already handed over, and you have nothing to point at."
        : "Your work is measured against a stated test, so acceptance is not a matter " +
            "of taste. Read the test itself. It is what you will be judged on, and now " +
            "is the cheap time to argue with it.";

    case "ip-assignment":
      return fired.has("reachesBeyondDeliverable")
        ? "Handing the client the rights in what you made for them is ordinary. This " +
            "goes further and takes things you brought with you, so tools and methods " +
            "you reuse on every job stop being yours to reuse."
        : "The rights in this work pass to the client, which is what nearly every " +
            "freelance contract says. It stops at what you made for this job, so what " +
            "you arrived with stays yours.";

    case "non-compete": {
      const months = monthsIn(reading.properties.durationMonths);
      const parts: string[] = [];
      if (fired.size > 0) {
        parts.push("When this ends, it stops you taking work you could otherwise take.");
        if (fired.has("durationMonths") && months !== null) {
          parts.push(`The block runs ${months} months past the last day of the job.`);
        }
        if (fired.has("industryScope")) {
          parts.push(
            "It is drawn wide enough to catch clients who have nothing to do with this one."
          );
        }
        if (fired.has("geographicScope")) {
          parts.push("It is not tied to the place you actually worked.");
        }
        if (fired.has("compensated")) {
          parts.push("You are paid nothing for agreeing to it.");
        }
      } else {
        parts.push(
          months === null
            ? "There is a limit on similar work once this ends, held to one area and " +
                "one kind of work, and you are paid separately for accepting it."
            : `There is a limit on similar work for ${months} months after this ends, ` +
                "held to one area and one kind of work, and you are paid separately " +
                "for accepting it."
        );
        parts.push("That is the ordinary shape for a restriction of this kind.");
      }
      parts.push(enforceabilityLine(jurisdiction));
      return parts.join(" ");
    }

    case "termination-for-convenience":
      return fired.has("killFee")
        ? "The client can end this whenever they like and owes nothing for the part " +
            "you have not reached yet. The hole it leaves in your schedule is yours to " +
            "fill, and the fee you planned around may never arrive."
        : "The client can end this early, but something is payable when they do, so " +
            "walking away is not free to them. Check the amount against what you would " +
            "actually lose.";
  }
}

/**
 * Whether a restriction would be enforced, stated relative to the law that governs the
 * contract and never as universal fact (`docs/adr/0005`, `docs/adr/0007`).
 *
 * When no jurisdiction has been established the claim is withheld rather than guessed.
 * That is not a hedge in `docs/adr/0006`'s sense — it is attribution, and the two
 * compose: a finding can name a missing property and still say whose law decides.
 */
function enforceabilityLine(jurisdiction: Jurisdiction): string {
  if (jurisdiction.source === "undetermined") {
    return (
      "Whether it would be enforced turns on the law governing this contract, and " +
      "nothing here names one."
    );
  }
  return `Whether it would be enforced is a question for the law of ${jurisdiction.name}.`;
}

function monthsIn(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const digits = /\d+/.exec(value);
    return digits === null ? null : Number(digits[0]);
  }
  return null;
}

function joinWithOr(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

/**
 * A stable handle for one flag inside one document, used as the sentence's element id
 * and as the margin mark's `aria-controls` target (`DESIGN.md`).
 *
 * Built here rather than taken from the model. An id has to be unique and URL-safe or
 * the margin mark points at nothing, and neither is worth trusting a generated string
 * for when the ordinal is free.
 */
export function flagId(clauseType: ClauseType, ordinal: number): string {
  return `${clauseType}-${ordinal}`;
}
