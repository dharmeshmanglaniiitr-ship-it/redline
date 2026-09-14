/**
 * The drafted reply: the wording a Signer sends back to ask for a change.
 *
 * This is the capability `docs/adr/0002` chose the segment for. A freelancer can email
 * their client and ask for a change before signing, and `PRODUCT.md` sets the bar at
 * sendability rather than plausibility — a counter-offer exists to be pasted into a
 * reply, so one the Signer would have to rewrite has failed, and one a lawyer would have
 * to fix defeats the point of using this instead of a lawyer.
 *
 * **The redraft is written here rather than asked for.** Same reasoning as
 * `lib/analysis/wording.ts`, and it lands harder on this file than on that one. Copy a
 * Signer reads has to have been through the humanizer skill before it ships, and prose a
 * model invents at request time has not (`CLAUDE.md`) — and this is not merely copy a
 * Signer reads, it is copy they send to their client under their own name. Written here
 * it can be read, reviewed and tested; asked for at request time it could only be hoped
 * about, and the test suite would be asserting over the stub's output rather than the
 * product's.
 *
 * **What it replaces is the flag's own citation, not a description of it.** `replaces`
 * is the `sourceSentence` the flag already carries, which `lib/analysis/citation.ts` has
 * already matched character for character against the document
 * (`lib/analysis/analyze.ts`). So the sentence a counter-offer claims to replace is a
 * sentence the document demonstrably contains, by construction rather than by a second
 * check — a redraft naming a clause that is not there would be `docs/adr/0001`'s defect
 * wearing different clothes.
 *
 * **It asks for a change; it does not say whether to sign.** The line `PRODUCT.md` draws
 * is held structurally here: every word of `text` is addressed to the Sender in the
 * Signer's own voice, so there is nobody in the message to advise. The redraft says what
 * the clause should say instead and what that is worth commercially, and stops.
 *
 * **No legal effect is asserted, in any jurisdiction.** `docs/adr/0005` and
 * `docs/adr/0008` make whether an indemnity, a liability ceiling, a restrictive covenant
 * or a renewal holds up a question for the governing law. A redraft that answered one —
 * "this would not be enforced here" — would be asserting as universal exactly what those
 * decisions forbid. The reasoning in every ask below is commercial: what the clause would
 * cost this Signer on this job. That is the same in every jurisdiction, which is why this
 * function takes no jurisdiction and why the drafted language is identical with one named
 * and with none. The attributed legal question stays where it already lives, on the
 * flag's `cost` (`lib/analysis/wording.ts`).
 *
 * **It borrows the contract's own vocabulary.** A redraft that calls the Signer "the
 * Contractor" into a contract that says "the Consultant" reads as boilerplate dropped in
 * from somewhere else, and the Sender has to translate it before it can go anywhere near
 * the document. `contractVocabulary` reads the parties' defined terms out of the text, so
 * the proposed wording arrives in the register the rest of the contract is written in.
 */

import type { PropertyValue } from "./clauses";
import type { CounterOffer } from "./result";
import type { ClauseReading } from "./severity";
import { clauseReferenceIn } from "@/lib/text/marking";

/**
 * The names this contract calls its parties and its work by.
 *
 * Read from the document rather than assumed, because a redraft only pastes into a
 * contract cleanly if it uses that contract's defined terms. Where nothing is
 * recognisable the commonest freelance pair is used, which is a wording choice rather
 * than a claim about the document — nothing downstream reads these as facts about it.
 */
export interface ContractVocabulary {
  /** What the document calls the party who sent it, e.g. "Client". */
  readonly sender: string;
  /** What the document calls the party being asked to sign, e.g. "Contractor". */
  readonly signer: string;
  /** A singular noun phrase for one unit of the work, e.g. "Deliverable". */
  readonly work: string;
}

const DEFAULT_VOCABULARY: ContractVocabulary = {
  sender: "Client",
  signer: "Contractor",
  work: "Deliverable",
};

/** Defined terms a document uses for the party who drafted and sent it. */
const SENDER_ROLES = [
  "Client",
  "Company",
  "Customer",
  "Purchaser",
  "Publisher",
  "Principal",
] as const;

/** Defined terms a document uses for the freelancer being asked to sign it. */
const SIGNER_ROLES = [
  "Contractor",
  "Consultant",
  "Supplier",
  "Freelancer",
  "Service Provider",
  "Developer",
  "Designer",
  "Writer",
] as const;

/**
 * Defined terms for the work, each with the singular noun phrase a redraft can use.
 *
 * "Services" has no usable singular, so it becomes "item of the Services" — the phrasing
 * the corpus's own retainers already use. Longer terms come first, so "Work Product"
 * wins over the "Work" inside it.
 */
const WORK_TERMS: readonly (readonly [string, string])[] = [
  ["Deliverables", "Deliverable"],
  ["Deliverable", "Deliverable"],
  ["Work Product", "item of Work Product"],
  ["Services", "item of the Services"],
  ["Materials", "item of the Materials"],
  ["Work", "item of the Work"],
];

/**
 * The vocabulary this document is written in.
 *
 * Counted on whole-word occurrences of the capitalised defined term, because that is
 * what a contract's own drafting looks like: the term is defined once in the preamble
 * and then used on every clause that touches it. A term appearing once is not a defined
 * term, so two occurrences are the floor and anything below it falls back.
 */
export function contractVocabulary(documentText: string): ContractVocabulary {
  return {
    sender: mostUsed(documentText, SENDER_ROLES) ?? DEFAULT_VOCABULARY.sender,
    signer: mostUsed(documentText, SIGNER_ROLES) ?? DEFAULT_VOCABULARY.signer,
    work: mostUsedWork(documentText) ?? DEFAULT_VOCABULARY.work,
  };
}

function mostUsed(documentText: string, terms: readonly string[]): string | null {
  let best: string | null = null;
  let bestCount = 1;
  for (const term of terms) {
    const count = occurrences(documentText, term);
    if (count > bestCount) {
      best = term;
      bestCount = count;
    }
  }
  return best;
}

function mostUsedWork(documentText: string): string | null {
  let best: string | null = null;
  let bestCount = 1;
  for (const [term, singular] of WORK_TERMS) {
    const count = occurrences(documentText, term);
    if (count > bestCount) {
      best = singular;
      bestCount = count;
    }
  }
  return best;
}

function occurrences(documentText: string, term: string): number {
  const pattern = new RegExp(`\\b${term.replace(/ /g, "\\s+")}\\b`, "g");
  return (documentText.match(pattern) ?? []).length;
}

/**
 * The counter-offer for one flagged clause.
 *
 * `triggers` is `severityTriggers`' answer for the same reading, so the redraft answers
 * the same properties the mark was derived from: a Signer is never handed a change that
 * has nothing to do with why the clause was flagged. A clause where nothing fired still
 * gets a counter-offer, because every flagged clause carries one — it is a smaller,
 * specific ask rather than a rewrite, and it never endorses the rest of the contract.
 *
 * @param sourceSentence the flag's verified citation, which becomes `replaces` unchanged
 */
export function counterOfferFor(
  reading: ClauseReading,
  sourceSentence: string,
  triggers: readonly string[],
  vocabulary: ContractVocabulary
): CounterOffer {
  const draft = draftFor(reading, new Set(triggers), vocabulary);
  const replacement = draft.keeps
    ? `${finished(sourceSentence)} ${draft.wording}`
    : draft.wording;

  return {
    replaces: sourceSentence,
    replacement,
    text: message(sourceSentence, replacement, draft),
  };
}

/**
 * The sendable message, with the sentence being replaced and the clause as the Signer
 * would like it to read both set out in full.
 *
 * Both appear verbatim inside `text`, which is what makes user story 17 true of the
 * thing that actually gets sent rather than only of the record behind it: the Sender
 * opens an email and can see the clause as it stands and the clause as asked for,
 * without opening the contract to work out which one is meant. The clause number comes
 * from the document's own numbering where it has one (`lib/text/marking.ts`).
 *
 * A clause where nothing fired is kept and added to rather than rewritten, and the
 * message says which of the two is being asked for. Getting that line wrong would be a
 * real defect and not a wording preference: "put this in its place" over a sentence that
 * was protecting the Signer asks the Sender to delete the protection.
 */
function message(replaces: string, replacement: string, draft: Draft): string {
  const reference = clauseReferenceIn(replaces);
  const opening =
    reference === null
      ? "Could I ask for one change before we go ahead? The clause as drafted reads:"
      : `Could I ask for one change to clause ${reference} before we go ahead? As drafted it reads:`;
  const proposal = draft.keeps
    ? "I would keep that and add a line to it, so the clause reads:"
    : "I would like to put this in its place:";

  return [opening, "", `"${replaces}"`, "", proposal, "", `"${replacement}"`, "", draft.ask].join(
    "\n"
  );
}

/** A sentence to build on, given the full stop a document might have left off. */
function finished(sentence: string): string {
  return /[.?!]["')\]]?$/.test(sentence.trim()) ? sentence.trim() : `${sentence.trim()}.`;
}

/** One redraft: the wording asked for, and why, in the Signer's words. */
interface Draft {
  /**
   * Whether the clause is kept and added to rather than rewritten. True where nothing
   * fired: the sentence is doing its job, so the ask is an extra line and the existing
   * wording has to survive it.
   */
  readonly keeps: boolean;
  /** The contract language asked for — the whole new clause, or the line added to it. */
  readonly wording: string;
  /** What the change is worth to the Signer, said to the Sender. */
  readonly ask: string;
}

/**
 * The redraft for each clause type, at both ends of its own threshold.
 *
 * The switch mirrors `costFor`'s, and for the same reason: a clause type added without a
 * redraft does not compile. Each arm reads which properties fired rather than only
 * whether any did, so the version of the clause a Signer asks for answers what is
 * actually wrong with theirs — the same distinction `docs/adr/0003` makes about severity,
 * applied to the remedy.
 *
 * Two rules run through every arm.
 *
 * **A clause where nothing fired is kept, not rewritten.** `keeps` is true there, and the
 * wording is a line added to the sentence rather than one standing in for it. The
 * alternative is worse than untidy: the sentence that fired nothing is often the sentence
 * protecting the Signer, and asking the Sender to put something in its place asks them to
 * delete it.
 *
 * **Nothing is said about the contract that the contract did not say.** A property fires
 * both when it is stated at its dangerous end and when it is not stated at all
 * (`docs/adr/0006`), and those are two different sentences. A restriction that names no
 * payment is not a restriction that pays nothing, and a ceiling the contract is silent
 * about has no figure to call disproportionate. Each arm below says which of the two it
 * found, because `CLAUDE.md` allows the product to state only what the document says —
 * and this is going to the person who drafted the document, where a claim the text does
 * not bear out is the fastest way to lose the argument.
 */
function draftFor(
  reading: ClauseReading,
  fired: ReadonlySet<string>,
  words: ContractVocabulary
): Draft {
  const { sender, signer, work } = words;

  switch (reading.clauseType) {
    case "payment-approval":
      return fired.has("acceptanceStandard")
        ? {
            keeps: false,
            wording:
              `The ${sender} shall notify the ${signer} in writing within ten (10) working days of ` +
              `delivery whether the ${work} meets the requirements set out in this Agreement, ` +
              `identifying by reference to those requirements anything that does not. Where no such ` +
              `notice is given within that period, the ${work} is treated as accepted. Where notice ` +
              `is given, the ${signer} shall correct the items identified and the ${work} is then ` +
              `reassessed against the same requirements. An invoice for an accepted ${work} falls ` +
              `due for payment on acceptance.`,
            ask:
              "As it stands, whether I get paid for finished work comes down to a judgment I have " +
              "no part in and no way to answer. This runs acceptance against the requirements we " +
              "have both already agreed and puts a clock on it, so I can see on delivery what is " +
              "left to do, and you keep the say over whether it has been done.",
          }
        : {
            keeps: true,
            wording:
              `Where the ${sender} gives no notice under this clause within the period it sets out, ` +
              `the ${work} is treated as accepted and the invoice for it falls due for payment on ` +
              `acceptance.`,
            ask:
              "The test itself is clear and I am happy to work to it. This only covers the case " +
              "where nobody gets round to reviewing, so a quiet fortnight at your end does not " +
              "leave an invoice in the air.",
          };

    case "ip-assignment":
      return fired.has("reachesBeyondDeliverable")
        ? {
            keeps: false,
            wording:
              `On payment in full for the relevant ${work}, the ${signer} assigns to the ${sender} ` +
              `all intellectual property rights in that ${work}. Anything the ${signer} created ` +
              `before this Agreement or outside it, including its tools, libraries, frameworks, ` +
              `methods and know-how, remains the ${signer}'s property, and the ${signer} grants the ` +
              `${sender} a perpetual, non-exclusive, royalty-free licence to use it so far as it is ` +
              `embedded in what the ${signer} delivers.`,
            ask:
              "You end up owning everything you commissioned, and a licence covering the parts of " +
              "my own kit that sit inside it, so nothing you have paid for stops working. What " +
              "stays with me is what I brought to the job and will bring to the next one.",
          }
        : {
            keeps: true,
            wording: `The assignment under this clause takes effect on payment in full for the relevant ${work}.`,
            ask:
              "The scope is right as drafted, so this is only about when it takes effect. It " +
              "ties the handover of the rights to the payment for them, so the two move together.",
          };

    case "non-compete": {
      if (fired.size === 0) {
        return {
          keeps: true,
          wording:
            `The restriction in this clause applies only to clients of the ${sender} that the ` +
            `${signer} worked with under this Agreement.`,
          ask:
            "The length, the area and the payment all look workable to me. This ties the " +
            "restriction to the client relationships it is there to protect, so it does not " +
            "catch work that has nothing to do with you.",
        };
      }

      const stated = reading.properties;
      const months = numberIn(stated.durationMonths);
      const drafted: string[] = [];
      if (fired.has("durationMonths")) {
        drafted.push(months === null ? "sets no end date I can find" : `runs for ${months} months`);
      }
      if (fired.has("geographicScope")) {
        drafted.push(
          stated.geographicScope === undefined
            ? "does not say where it applies"
            : "is not tied to the places I actually worked"
        );
      }
      if (fired.has("industryScope")) {
        drafted.push(
          stated.industryScope === undefined
            ? "does not say what work it covers"
            : "reaches clients who have nothing to do with this job"
        );
      }
      if (fired.has("compensated")) {
        drafted.push(
          stated.compensated === undefined
            ? "says nothing about paying me for it"
            : "pays me nothing for it"
        );
      }

      return {
        keeps: false,
        wording:
          `For six (6) months after the end of this Agreement, the ${signer} shall not provide ` +
          `services of the same kind as those provided under it to any client of the ${sender} ` +
          `that the ${signer} worked with under it. The ${sender} shall pay the ${signer}, in ` +
          `respect of that restriction, a sum the parties agree in writing before this Agreement ` +
          `ends. The restriction does not otherwise limit the work the ${signer} may take on.`,
        ask:
          `As drafted it ${joinWithAnd(drafted)}, which would close off a good deal of the work ` +
          "I live on. What this protects instead is the client relationships this job actually " +
          "built, which is what I take the clause to be for.",
      };
    }

    case "termination-for-convenience":
      return fired.has("killFee")
        ? {
            keeps: false,
            wording:
              `Either party may end this Agreement by giving the other thirty (30) days' written ` +
              `notice. Where the ${sender} ends this Agreement under this clause, the ${sender} ` +
              `shall pay for everything accepted or delivered before the end date, for work in ` +
              `progress on the date of the notice, and twenty-five per cent (25%) of the fees for ` +
              `the work not yet started.`,
            ask:
              "Holding dates open for a job means turning other work down for them, and as " +
              "drafted that time can go with nothing payable against it. This keeps the early " +
              "exit open to you and splits what it costs. Twenty-five per cent is an opening " +
              "figure, so say if you would rather set it somewhere else.",
          }
        : {
            keeps: true,
            wording:
              `Where the ${sender} ends this Agreement under this clause, the ${sender} shall also ` +
              `pay for work in progress on the date of the notice.`,
            ask:
              "Something is payable already, so this is a small one. It picks up the " +
              "half-finished work sitting on my desk the day the notice arrives, so that does " +
              "not fall between the two.",
          };

    case "one-sided-indemnity": {
      if (fired.size === 0) {
        return {
          keeps: true,
          wording:
            "Neither party indemnifies the other against a claim to the extent that the claim " +
            "arises from the other party's own act or omission.",
          ask:
            "The shape of this one works for me. It only puts on the page that neither of us " +
            "picks up the bill for something the other did.",
        };
      }

      const stated = reading.properties;
      const drafted: string[] = [];
      if (fired.has("mutual")) {
        drafted.push(
          stated.mutual === undefined
            ? "As drafted it does not say that the same cover runs back to me, so trouble that starts at your end looks like mine to carry."
            : "As drafted the cover runs one way, so trouble that starts at your end is still mine to carry."
        );
      }
      if (fired.has("triggeringClaims")) {
        drafted.push(
          stated.triggeringClaims === undefined
            ? "It does not say what kind of claim sets it off, so I cannot tell where it stops."
            : "It also fires on claims I had no hand in."
        );
      }
      if (fired.has("cappedByLiabilityLimit")) {
        drafted.push(
          stated.cappedByLiabilityLimit === undefined
            ? "And it does not say whether it sits inside the ceiling this Agreement otherwise puts on what either of us can be asked to pay."
            : "And it sits outside the ceiling this Agreement otherwise puts on what either of us can be asked to pay, which is what makes it open-ended."
        );
      }

      return {
        keeps: false,
        wording:
          "Each party shall indemnify the other against a claim brought by a third party to the " +
          "extent that the claim arises from that party's own breach of this Agreement or its own " +
          "negligence. An indemnity given under this clause is subject to the limit of liability " +
          "in this Agreement.",
        ask: `${drafted.join(" ")} This keeps each of us covering what we caused, inside the same ceiling as everything else here.`,
      };
    }

    case "uncapped-liability": {
      if (fired.size === 0) {
        return {
          keeps: true,
          wording:
            "Neither party is liable to the other for loss of profit, loss of business or any " +
            "indirect or consequential loss.",
          ask:
            "There is a ceiling already and it covers both of us. This adds the usual line " +
            "about knock-on losses, so the ceiling is not reached by a claim about business " +
            "someone else says they lost.",
        };
      }

      const stated = reading.properties;
      const noCeiling = fired.has("liabilityCap");
      const drafted: string[] = [];
      if (noCeiling) {
        drafted.push(
          stated.liabilityCap === undefined
            ? "As drafted the clause names no top figure for what I could be asked to pay."
            : "As drafted there is no top figure on what I could be asked to pay."
        );
      }
      if (fired.has("capAppliesToSigner")) {
        drafted.push(
          stated.capAppliesToSigner === undefined
            ? "It does not say that the limit in it covers me as well as you."
            : "The limit in it covers you and not me."
        );
      }
      // Only worth saying where a figure exists to compare it with. Where the clause sets
      // no ceiling at all there is nothing to call disproportionate, and the first line
      // has already said the thing that matters.
      if (fired.has("capProportionateToFee") && !noCeiling) {
        drafted.push(
          stated.capProportionateToFee === undefined
            ? "And nothing ties that figure to what this job pays."
            : "And the figure stands a long way above what this job pays, which makes it a ceiling in name only."
        );
      }

      return {
        keeps: false,
        wording:
          `The total liability of each party under this Agreement, whether arising in contract or ` +
          `otherwise, is limited to the total fees payable to the ${signer} under this Agreement. ` +
          `Nothing in this Agreement limits either party's liability for death or personal injury ` +
          `caused by negligence, or for fraud.`,
        ask: `${drafted.join(" ")} A ceiling tied to the fee keeps what I carry in some relation to the size of the job, and it reads the same from both sides.`,
      };
    }

    case "auto-renewal": {
      if (fired.size === 0) {
        return {
          keeps: true,
          wording:
            `The ${sender} shall notify the ${signer} in writing at least fourteen (14) days ` +
            `before the end of each period that it is about to continue.`,
          ask:
            "The renewal is short and I can leave it part-way through, so there is nothing here " +
            "I want changed. A reminder before each one just means neither of us continues by " +
            "accident.",
        };
      }

      const stated = reading.properties;
      const drafted: string[] = [];
      const months = numberIn(stated.renewalTermMonths);
      if (fired.has("renewalTermMonths")) {
        drafted.push(
          months === null
            ? "As drafted the clause does not say how long a further term runs, so missing one date could sign me up for a long one."
            : `As drafted, missing one date signs me up for another ${months} months.`
        );
      }
      const days = numberIn(stated.noticeWindowDays);
      if (fired.has("noticeWindowDays")) {
        drafted.push(
          days === null
            ? "It does not say how much warning I have to give to stop it, which is the part I would most need in the diary."
            : `The notice has to be in ${days} days ahead, so the decision comes round long before either of us is thinking about it.`
        );
      }
      if (fired.has("terminableDuringRenewal")) {
        drafted.push(
          stated.terminableDuringRenewal === undefined
            ? "And it does not say whether I can leave part-way through a further term."
            : "And once a further term has started there is no way out of it."
        );
      }

      return {
        keeps: false,
        wording:
          `At the end of each term this Agreement continues for a further period of one (1) month ` +
          `unless either party gives the other thirty (30) days' written notice to end it. Either ` +
          `party may end a continued period by giving thirty (30) days' written notice at any time ` +
          `during that period. The ${sender} shall notify the ${signer} in writing at least thirty ` +
          `(30) days before the end of each period that it is about to continue.`,
        ask: `${drafted.join(" ")} Rolling on a month at a time, with a reminder before each one, keeps the work going without either of us being held by a date we missed.`,
      };
    }

    case "unilateral-change": {
      if (fired.size === 0) {
        return {
          keeps: true,
          wording:
            "Where the parties do not agree a proposed change, either party may end this Agreement " +
            "by giving thirty (30) days' written notice.",
          ask:
            "Changes already need both signatures here, which I am glad of. This adds a clean " +
            "way out if we ever reach a change neither of us will put a name to.",
        };
      }

      const stated = reading.properties;
      const drafted: string[] = [];
      if (fired.has("changeRequiresSignerAgreement")) {
        drafted.push(
          stated.changeRequiresSignerAgreement === undefined
            ? "As drafted the clause does not say that a change waits for my agreement."
            : "As drafted, a change takes effect whether I have agreed to it or not."
        );
      }
      if (fired.has("whatMayChange")) {
        drafted.push(
          stated.whatMayChange === undefined
            ? "It does not say what may be changed, so I cannot tell whether the fee and the work are within reach of it."
            : "What can be changed reaches the fee and the work itself, so the job I priced is not the job I would be held to."
        );
      }
      if (fired.has("exitOnChange")) {
        drafted.push(
          stated.exitOnChange === undefined
            ? "And it does not say whether I could end the arrangement over a change I did not want."
            : "And there is no way out of a change I would never have agreed to."
        );
      }

      return {
        keeps: false,
        wording:
          `A change to the work, to the timing or to the fees takes effect only once both parties ` +
          `have signed a written record of it. Where the parties do not agree a proposed change, ` +
          `this Agreement continues on its existing terms and either party may end it by giving ` +
          `thirty (30) days' written notice.`,
        ask: `${drafted.join(" ")} This still lets you propose any change you like. It means we both put a name to it, and either of us can end the arrangement if we cannot agree.`,
      };
    }
  }
}

/**
 * The number inside a property value.
 *
 * A local copy of the same reading `lib/analysis/wording.ts` does, rather than a shared
 * export, because the two files write different sentences from it and neither should
 * acquire a reason to import the other's prose.
 */
function numberIn(value: PropertyValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const digits = /\d+/.exec(value);
    return digits === null ? null : Number(digits[0]);
  }
  return null;
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
