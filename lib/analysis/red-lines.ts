/**
 * The Signer's own standard, read against a clause.
 *
 * A proof is marked against a house style. Redline's house style is
 * `lib/analysis/severity.ts` — the thresholds `PRD.md` §5 and `docs/adr/0008` settled,
 * which say what a clause costs anybody. A Signer's red lines are their own style sheet
 * laid over it: the things they will not sign whatever Redline makes of them.
 *
 * The two are kept apart on purpose and `docs/adr/0009` records why. Severity is a fact
 * about the wording and stays one, so "severity, 3 of 4" means the same thing on two
 * Signers' screens and can still be defended by pointing at the sentence. What a red line
 * moves is the order, which is the thing a Signer with ten minutes actually depends on.
 *
 * Matching is done here, in code, and not by the model. The same argument as
 * `docs/adr/0003`: a crossing a model asserted could not be shown to a Signer as anything
 * but an opinion, where this can be read, tested and disagreed with. It is also why the
 * note beside a crossing quotes their own sentence back at them rather than paraphrasing
 * it — the claim being made is "you wrote this", and nothing else.
 *
 * It errs towards matching. Showing a Signer a clause they said they cared about, when it
 * turns out to be fine, costs them the second it takes to read the mark and dismiss it.
 * Missing one costs them the thing they wrote the line about, and they never find out.
 * That is `docs/adr/0004`'s direction of error applied to somebody's own words.
 */

import type { ClauseType } from "./clauses";
import type { RedLine, RedLineCrossing } from "./result";
import { redLineNoteFor } from "./wording";

/**
 * The words a Signer uses when they mean each clause type.
 *
 * Written from what the person signing would type, not from the clause's legal name:
 * "I never sign anything that renews itself" has to reach `auto-renewal`, and almost
 * nobody writes "termination for convenience" when they mean being dropped halfway
 * through a job. Keyed on clause type so a new one cannot be added without deciding what
 * a Signer would call it.
 */
const SPOKEN_OF: Record<ClauseType, RegExp> = {
  "payment-approval":
    /\b(paid|pay|payment|payments|invoice|invoices|invoiced|approval|approve|approves|approved|sign[- ]?off|signoff|satisfaction|satisfied|acceptance|discretion|withhold|withheld)\b/,
  "ip-assignment":
    /\b(ip|intellectual property|copyright|copyrights|moral rights|ownership|own|owns|owning|assign|assigns|assigned|assignment|licence|license|portfolio|tools|methods|know[- ]?how|source code|templates|template)\b/,
  "non-compete":
    /\b(non[- ]?compete|noncompete|non[- ]?competes|non[- ]?solicit|nonsolicit|non[- ]?soliciting|non[- ]?solicitation|restrictive covenant|covenant|compete|competing|competitor|competitors|exclusivity|restriction|restrictions|restricted|restrain|restraint)\b/,
  "termination-for-convenience":
    /\b(terminate|terminates|terminated|termination|cancel|cancels|cancelled|canceled|cancellation|kill fee|notice period|for convenience|walk away|drop me|dropped|pull out|cut short)\b/,
  "one-sided-indemnity":
    /\b(indemnity|indemnities|indemnify|indemnifies|indemnified|indemnification|hold harmless|defend|third[- ]party claim|third[- ]party claims)\b/,
  "uncapped-liability":
    /\b(liability|liabilities|liable|uncapped|unlimited|cap|capped|ceiling|damages|exposure|sued|on the hook)\b/,
  "auto-renewal":
    /\b(auto[- ]?renew|auto[- ]?renews|auto[- ]?renewal|renew|renews|renewal|renewing|rolling|rolls over|roll over|evergreen|locked in|lock[- ]?in|tie[- ]?in)\b/,
  "unilateral-change":
    /\b(change|changes|changed|changing|amend|amends|amended|amendment|vary|varies|varied|variation|unilateral|unilaterally|rewrite|rewrites|rewritten|revise|revised|alter|alters|altered|scope creep)\b/,
};

/**
 * Wording that puts a bound on a refusal.
 *
 * "I will not sign a non-compete" refuses the clause. "I will not sign a non-compete
 * longer than six months" refuses a shape of it, and a three-month one is a clause that
 * Signer said they would accept. The difference decides whether a clause Redline reads as
 * ordinary is pulled to the top of their list or left where it is, so it is worth telling
 * apart rather than treating every refusal as total.
 *
 * Only wording that actually measures something counts. Bare prepositions are left out on
 * purpose: "under no circumstances" and "I will not hand over my tools" are as absolute as
 * a refusal gets, and reading `under` or `over` as a bound would turn the plainest
 * phrasings into qualified ones.
 *
 * A heuristic over somebody's free text, and `docs/adr/0009` says so. It will read a line
 * wrong sometimes; when it does, the clause is ranked as though the line were absolute,
 * which shows the Signer something they can dismiss rather than hiding something they
 * cannot.
 */
const BOUNDED =
  /\b(longer than|shorter than|more than|less than|fewer than|wider than|broader than|narrower than|beyond|unless|except|other than|provided|as long as|so long as|only if|only when|without|up to|at least|at most|month|months|week|weeks|day|days|year|years|mile|miles|km)\b|\d/;

/**
 * Which of the Signer's red lines this clause meets.
 *
 * Two things have to be true. The line has to be about this kind of clause — a Signer who
 * has written about payment has said nothing about a restrictive covenant, and ranking
 * one against the other would be inventing a standard they do not hold. And the clause has
 * to be one the line actually reaches: either Redline already found something in it to
 * take up, or the line refuses the whole clause type, in which case its being in the
 * contract at all is the thing the Signer said they would not accept.
 *
 * That second case is the whole feature. A three-month, paid-for, ten-mile restriction is
 * severity 1 and stays severity 1, because that is what the wording is worth. For a Signer
 * whose standing note reads "I do not sign non-competes", it goes to the top of the list
 * anyway.
 *
 * @param triggers What `severityTriggers` found in this clause — empty when Redline reads
 *   the clause as ordinary.
 */
export function crossingsOf(
  redLines: readonly RedLine[],
  clauseType: ClauseType,
  triggers: readonly string[]
): readonly RedLineCrossing[] {
  const crossings: RedLineCrossing[] = [];
  const seen = new Set<string>();

  for (const redLine of redLines) {
    const wording = redLine.text.trim();
    if (wording === "") continue;

    const comparable = wording.toLowerCase();
    if (!SPOKEN_OF[clauseType].test(comparable)) continue;

    const refusesOutright = !BOUNDED.test(comparable);
    if (triggers.length === 0 && !refusesOutright) continue;

    // The same line written twice is one line. A Signer who has said it once should not
    // read it twice in the margin.
    const key = comparable.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    crossings.push({
      redLine: wording,
      note: redLineNoteFor(triggers.length > 0 ? "already-marked" : "reads-as-ordinary"),
    });
  }

  return crossings;
}

/**
 * The Signer's standard, written into the prompt that reads clauses.
 *
 * This is the half of `docs/spec-v1.md`'s "an input, not a post-filter" that ranking alone
 * does not cover. The reading itself is made with the Signer's lines in hand, so a clause
 * that only matters because of something they wrote is reported rather than passed over as
 * unremarkable — and nothing is dropped afterwards on account of them.
 *
 * The model is given their words and told not to judge against them. Which clause meets
 * which line is `crossingsOf`'s answer, and the sentences a Signer reads about it are
 * written in `lib/analysis/wording.ts`. Empty when there are no red lines, so a Signer
 * without any is read exactly as they were before this existed.
 */
export function redLinesBriefing(redLines: readonly RedLine[]): readonly string[] {
  const recorded = redLines
    .map((redLine) => redLine.text.trim())
    .filter((wording) => wording !== "");
  if (recorded.length === 0) return [];

  return [
    "",
    "The person signing keeps a standing note of what they will not accept. These are",
    "their own words, and they are a standard rather than a description of this",
    "contract:",
    "",
    ...recorded.map((wording) => `- ${wording}`),
    "",
    "Report a clause that touches one of those even where it reads as ordinary to you, so",
    "they can weigh it themselves. Do not say which one it touches, do not say whether the",
    "contract meets their standard, and do not repeat their words back. That is worked out",
    "afterwards.",
  ];
}
