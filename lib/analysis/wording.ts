/**
 * Every word a Signer reads on a flag, and the name of every entry on the checklist.
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

import type { ChecklistEntry, ClauseType } from "./clauses";
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
 * What each checklist entry is called in front of a Signer.
 *
 * `docs/adr/0004` asks for a clean bill specific enough to be worth something, and
 * "ip-assignment" is an identifier, not a name — a reader cannot tell from it what was
 * checked, which is the whole job of the list. Each line is written as the question the
 * entry answers about their own contract, so a Signer reading down the cleared list
 * knows what Redline went looking for.
 *
 * Keyed on the checklist rather than on the clause types with settled thresholds, so an
 * entry added without a name will not compile even in the window before anything can be
 * flagged under it.
 */
const CHECKLIST_NAMES: Record<ChecklistEntry, string> = {
  "payment-approval": "What your work has to meet before you are paid",
  "ip-assignment": "What the client ends up owning",
  "non-compete": "What you can take on after this ends",
  "termination-for-convenience": "What you are owed if they end it early",
  "one-sided-indemnity": "Who covers it when someone else brings a claim",
  "uncapped-liability": "Whether there is a ceiling on what you could be made to pay",
  "auto-renewal": "Whether it renews itself",
  "unilateral-change": "Whether they can change the terms on their own",
};

/** The name a cleared checklist entry is read under (`DESIGN.md`, Cleared list). */
export function checklistEntryName(entry: ChecklistEntry): string {
  return CHECKLIST_NAMES[entry];
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
  mutual: "whether the same cover runs back to you",
  triggeringClaims: "what kind of claim sets the cover off",
  cappedByLiabilityLimit: "whether the cover sits inside the ceiling on what you can be made to pay",
  liabilityCap: "what the ceiling is on what you could be made to pay",
  capAppliesToSigner: "whether that ceiling protects you as well as the client",
  capProportionateToFee: "how the ceiling compares with what the job pays",
  renewalTermMonths: "how long each renewal runs",
  noticeWindowDays: "how much warning you have to give to stop it renewing",
  terminableDuringRenewal: "whether you can leave part-way through a renewed term",
  changeRequiresSignerAgreement: "whether a change needs your agreement",
  whatMayChange: "what they are allowed to change",
  exitOnChange: "whether you can walk away from a change you did not want",
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

/**
 * Why a clause is sitting above the others: because the Signer said so, not because
 * Redline moved its mark (`docs/adr/0009`).
 *
 * Two cases, and the second is the one that needed writing. A clause Redline already had
 * something to say about needs only the reason it came up the list. A clause Redline reads
 * as ordinary needs the disagreement stated out loud, because the meter beside it still
 * says the wording is standard and a Signer is owed both halves of that rather than left
 * to wonder why a mark reading "noted" is at the top of their page.
 *
 * Neither sentence quotes the red line. The line itself is shown beside this, in the
 * Signer's own words, which is the only claim being made here.
 */
export function redLineNoteFor(met: "already-marked" | "reads-as-ordinary"): string {
  return met === "already-marked"
    ? "This is one of the lines you wrote down, and the contract crosses it."
    : "Redline reads this clause as standard wording. You have said you will not sign one, so it is here at the top.";
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
    case "one-sided-indemnity":
      return marked
        ? "You are on the hook for other people's claims"
        : "Each side carries the trouble it causes";
    case "uncapped-liability":
      return marked
        ? "What you could owe is not held to the fee"
        : "There is a ceiling, and it covers you too";
    case "auto-renewal":
      return marked
        ? "It renews itself unless you stop it in time"
        : "It rolls on, and you can stop it";
    case "unilateral-change":
      return marked
        ? "They can change the deal after you sign"
        : "Changes need both names on them";
  }
}

/**
 * What the clause would cost the Signer, in their terms rather than the contract's
 * (user story 8).
 *
 * Written from the properties that were read, so two contracts with the same clause type
 * and different wording do not get the same paragraph. Four clause types carry a legal
 * claim — the restriction after the job, the indemnity, the liability ceiling and the
 * renewal — and every one of those claims is attributed rather than asserted: whether it
 * would hold up is answered by a jurisdiction, and when the contract names none, the
 * answer is that nobody can say, not a guess at US law (`docs/adr/0005`,
 * `docs/adr/0007`). The unilateral change carries no such line because nothing here
 * makes a claim about its legal effect (`docs/adr/0008`).
 *
 * **A property fires on two different facts, and they get two different sentences.** A
 * property is a trigger both when the contract states it at its dangerous end and when the
 * contract never states it at all (`docs/adr/0006`), and those are not the same finding. A
 * restriction that names no payment is not a restriction that pays nothing; a ceiling the
 * contract is silent about has no figure to call disproportionate. Each arm below reads
 * `reading.properties` to see which of the two it has, the way
 * `lib/analysis/counter-offer.ts` does on the redraft, because `CLAUDE.md` lets the
 * product state only what the document says. The hedge names the gap afterwards; it is not
 * there to take back a sentence this function should not have written.
 */
export function costFor(
  reading: ClauseReading,
  triggers: readonly string[],
  jurisdiction: Jurisdiction
): string {
  const fired = new Set(triggers);

  switch (reading.clauseType) {
    case "payment-approval":
      if (!fired.has("acceptanceStandard")) {
        return (
          "Your work is measured against a stated test, so acceptance is not a matter " +
          "of taste. Read the test itself. It is what you will be judged on, and now " +
          "is the cheap time to argue with it."
        );
      }
      return reading.properties.acceptanceStandard === undefined
        ? "The client decides whether your finished work is good enough, and the " +
            "contract does not say what test they have to apply. They can hold back " +
            "money for work you have already handed over, and you have nothing to " +
            "point at."
        : "The client decides whether your finished work is good enough, and the " +
            "contract makes that a matter of their own satisfaction. They can hold back " +
            "money for work you have already handed over, and there is no test you could " +
            "point at and say you met.";

    case "ip-assignment":
      if (!fired.has("reachesBeyondDeliverable")) {
        return (
          "The rights in this work pass to the client, which is what nearly every " +
          "freelance contract says. It stops at what you made for this job, so what " +
          "you arrived with stays yours."
        );
      }
      return reading.properties.reachesBeyondDeliverable === undefined
        ? "Handing the client the rights in what you made for them is ordinary. This " +
            "clause does not say where the assignment stops. Nothing in it holds the " +
            "handover to this job, so the tools and methods you reuse everywhere are " +
            "inside its reach as it reads."
        : "Handing the client the rights in what you made for them is ordinary. This " +
            "goes further and takes things you brought with you, so tools and methods " +
            "you reuse on every job stop being yours to reuse.";

    case "non-compete": {
      const stated = reading.properties;
      const months = numberIn(stated.durationMonths);
      const parts: string[] = [];
      if (fired.size > 0) {
        parts.push("When this ends, it stops you taking work you could otherwise take.");
        if (fired.has("durationMonths")) {
          parts.push(
            months === null
              ? "The contract does not say how long the block lasts, and nothing in it " +
                  "brings it to an end."
              : `The block runs ${months} months past the last day of the job.`
          );
        }
        if (fired.has("industryScope")) {
          parts.push(
            stated.industryScope === undefined
              ? "It does not say what work it covers."
              : "It is drawn wide enough to catch clients who have nothing to do with this one."
          );
        }
        if (fired.has("geographicScope")) {
          parts.push(
            stated.geographicScope === undefined
              ? "It does not say where it applies."
              : "It is not tied to the place you actually worked."
          );
        }
        if (fired.has("compensated")) {
          parts.push(
            stated.compensated === undefined
              ? "It says nothing about paying you for it."
              : "You are paid nothing for agreeing to it."
          );
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
      if (!fired.has("killFee")) {
        return (
          "The client can end this early, but something is payable when they do, so " +
          "walking away is not free to them. Check the amount against what you would " +
          "actually lose."
        );
      }
      return reading.properties.killFee === undefined
        ? "The client can end this whenever they like, and the contract does not say " +
            "that anything is payable for the part you have not reached yet. The hole " +
            "it leaves in your schedule is yours to fill, and the fee you planned " +
            "around may never arrive."
        : "The client can end this whenever they like and owes nothing for the part " +
            "you have not reached yet. The hole it leaves in your schedule is yours to " +
            "fill, and the fee you planned around may never arrive.";

    case "one-sided-indemnity": {
      const stated = reading.properties;
      const parts: string[] = [];
      if (fired.size > 0) {
        parts.push(
          "If someone outside this contract brings a claim, you are the one who pays for it."
        );
        if (fired.has("mutual")) {
          parts.push(
            stated.mutual === undefined
              ? "It does not say that the same cover runs back to you, so nothing here covers trouble the client brings on you."
              : "The promise runs one way only, so trouble the client brings on you is still yours to carry."
          );
        }
        if (fired.has("triggeringClaims")) {
          parts.push(
            stated.triggeringClaims === undefined
              ? "It does not say what kind of claim sets it off, so nothing in it holds the promise to trouble you caused."
              : "It is not held to trouble you actually caused."
          );
        }
        if (fired.has("cappedByLiabilityLimit")) {
          parts.push(
            stated.cappedByLiabilityLimit === undefined
              ? "And it does not say whether it sits inside the ceiling on what you can be made to pay."
              : "It sits outside the ceiling on what you can be made to pay, so the ceiling does not hold it."
          );
        }
      } else {
        parts.push(
          "Each side covers the outside claims it brings on the other, and that cover is " +
            "held inside the same ceiling as everything else here. Read what counts as a " +
            "claim, because that is what decides when it comes into play."
        );
      }
      parts.push(
        lawDecides(
          fired.size > 0
            ? "Whether a promise this wide holds or is cut back by statute"
            : "Whether a promise like this holds or is cut back by statute",
          jurisdiction
        )
      );
      return parts.join(" ");
    }

    case "uncapped-liability": {
      const stated = reading.properties;
      const noCeiling = fired.has("liabilityCap");
      const parts: string[] = [];
      if (fired.size > 0) {
        parts.push(
          "What this could cost you is not held to what the job is worth."
        );
        if (noCeiling) {
          parts.push(
            stated.liabilityCap === undefined
              ? "The clause names no top figure for what you could be asked to pay."
              : "It says outright that there is no top figure."
          );
        }
        if (fired.has("capAppliesToSigner")) {
          parts.push(
            stated.capAppliesToSigner === undefined
              ? "It does not say that a limit here covers you as well as the client."
              : "The limit that is set protects the client, not you."
          );
        }
        // Only worth saying where a figure exists to compare against. With no ceiling at
        // all there is nothing to call disproportionate, and the line above has already
        // said the thing that matters (`lib/analysis/counter-offer.ts` reads it the same
        // way).
        if (fired.has("capProportionateToFee") && !noCeiling) {
          parts.push(
            stated.capProportionateToFee === undefined
              ? "And nothing ties that figure to what this job pays."
              : "And the figure named stands far above what this job pays, which makes it a ceiling in name only."
          );
        }
      } else {
        parts.push(
          "There is a top figure on what you could be made to pay, it covers you as well " +
            "as the client, and it is set against what the job is worth. Check the figure " +
            "against the size of the job before you lean on it."
        );
      }
      parts.push(
        lawDecides(
          fired.size > 0
            ? "Whether exposure like this can be limited or is already limited by statute"
            : "Whether a ceiling like this holds or is set aside by statute",
          jurisdiction
        )
      );
      return parts.join(" ");
    }

    case "auto-renewal": {
      const stated = reading.properties;
      const parts: string[] = [];
      if (fired.size > 0) {
        parts.push(
          "Unless you give notice in time, this starts again on the terms you agreed once."
        );
        const months = numberIn(stated.renewalTermMonths);
        if (fired.has("renewalTermMonths")) {
          parts.push(
            months === null
              ? "It does not say how long a further term runs, so missing one date could sign you up for a long one."
              : `Each renewal signs you up for another ${months} months.`
          );
        }
        const days = numberIn(stated.noticeWindowDays);
        if (fired.has("noticeWindowDays")) {
          parts.push(
            days === null
              ? "It does not say how much warning you have to give to stop it, which is the part you would most need in the diary."
              : `You have to give notice ${days} days before the term ends, so the decision comes round a long way ahead of it.`
          );
        }
        if (fired.has("terminableDuringRenewal")) {
          parts.push(
            stated.terminableDuringRenewal === undefined
              ? "And it does not say whether you can leave part-way through a renewed term."
              : "Once a renewal has started, you cannot leave part-way through it."
          );
        }
      } else {
        parts.push(
          "It carries on in short steps unless one of you says otherwise, and you can give " +
            "notice or leave part-way through a renewed term. That is the ordinary shape " +
            "for work meant to continue."
        );
      }
      parts.push(
        lawDecides(
          "Whether a renewal like this needs its own notice or a fresh agreement to take effect",
          jurisdiction
        )
      );
      return parts.join(" ");
    }

    case "unilateral-change": {
      if (fired.size === 0) {
        return (
          "A change to the money or to the work counts only once both of you have signed " +
          "for it, so the terms you read are the terms you are held to."
        );
      }
      const stated = reading.properties;
      const parts = ["Part of what you agreed can be rewritten after you have signed it."];
      if (fired.has("changeRequiresSignerAgreement")) {
        parts.push(
          stated.changeRequiresSignerAgreement === undefined
            ? "The clause does not say that a change waits for your agreement."
            : "A change takes effect whether you agree to it or not."
        );
      }
      if (fired.has("whatMayChange")) {
        parts.push(
          stated.whatMayChange === undefined
            ? "It does not say what they can change, so you cannot tell whether the fee and the work are within reach of it."
            : "What they can change reaches the money and the work, so the job you priced is not the job you are held to."
        );
      }
      if (fired.has("exitOnChange")) {
        parts.push(
          stated.exitOnChange === undefined
            ? "And it does not say whether you could end the arrangement over a change you did not want."
            : "You are given no way out of a change you would never have signed."
        );
      }
      return parts.join(" ");
    }
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
  return lawDecides("Whether it would be enforced", jurisdiction);
}

/**
 * One legal question, attributed to the law that answers it.
 *
 * `docs/adr/0007` lists the claims that are jurisdiction-dependent, and four of them
 * belong to clauses this file writes about: whether a liability cap or an indemnity is
 * limited or overridden by statute, whether an auto-renewal needs its own notice or
 * consent to be effective, and whether a restriction after the job would be enforced.
 * Each is put here as a question with an owner rather than as an answer, so the sentence
 * a Signer reads names whose law decides instead of implying that someone's already has.
 *
 * `subject` is the question, written without its full stop — "Whether it would be
 * enforced". Nothing else in this file states a legal effect, which is the complement
 * `docs/adr/0007` insists on: what the document says is the same in every jurisdiction.
 */
function lawDecides(subject: string, jurisdiction: Jurisdiction): string {
  if (jurisdiction.source === "undetermined") {
    return `${subject} turns on the law governing this contract, and nothing here names one.`;
  }
  return `${subject} is a question for the law of ${jurisdiction.name}.`;
}

function numberIn(value: unknown): number | null {
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
