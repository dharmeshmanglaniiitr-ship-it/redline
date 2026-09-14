/**
 * The Signer's own standard, and whether it actually reaches the reading.
 *
 * `PRD.md` §4 test 7 and `docs/spec-v1.md` (Testing Decisions, 6) are blunt about the
 * stakes: **the same document analysed under two different red-line sets must rank
 * differently, or the feature is decorative.** So the comparison here is of ranking and of
 * what each flag carries, never of list length — a shorter list is the failure this ticket
 * exists to avoid, not the evidence that it worked.
 *
 * Four claims are asserted, and they only mean anything together:
 *
 * - **The order moves.** One document, three standards, three different orders — including
 *   a standard that puts a severity 2 above three severity 3s, which a re-sort on severity
 *   could not produce.
 * - **Nothing is dropped.** The same flags come back, with the same citations and the same
 *   severities, whatever the Signer has written down. A red line that hid a row would
 *   satisfy a screen and fail the feature (`docs/adr/0009`).
 * - **Severity does not move.** `docs/adr/0003` makes severity a fact about the wording,
 *   and `docs/adr/0007` holds it still across jurisdictions on exactly that ground. A
 *   Signer's standard is not a fact about the wording either, so it does not move it.
 *   Asserted flag by flag, the way `tests/jurisdiction.test.ts` does.
 * - **A clause Redline calls standard goes to the top when the Signer refuses it.** This
 *   is the case a post-filter cannot fake and a severity re-weighting gets wrong: a short,
 *   paid-for, ten-mile restriction is severity 1 and stays severity 1, and it is still the
 *   first thing on the page of a Signer who does not sign restrictive covenants.
 *
 * The gateway is the fixture stub, so nothing here needs a key or a network. The stub
 * ignores the prompt when it builds findings, which means a difference in output between
 * two runs can only have come from code in `lib/analysis/` — that is what makes these
 * comparisons worth making.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkedGalley } from "@/app/(app)/review/marked-galley";
import { RedLines } from "@/app/(app)/review/red-lines";
import type { RedLinesState } from "@/app/(app)/review/red-lines-state";
import { analyze } from "@/lib/analysis/analyze";
import { crossingsOf, redLinesBriefing } from "@/lib/analysis/red-lines";
import type { AnalysisResult, RedLine, RiskFlag } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";

import { fixtureNames, loadFixture } from "./support/fixtures";
import { expectQuotedVerbatim } from "./support/invariants";
import { createStubModelGateway } from "./support/stub-model";

/** Standing notes written the way a freelancer writes them, not as clause names. */
const REFUSES_RESTRICTIONS: readonly RedLine[] = [
  { text: "I will not sign a non-compete, whatever the length." },
];
const REFUSES_BEING_DROPPED: readonly RedLine[] = [
  { text: "I do not accept termination for convenience with no kill fee." },
];
const REFUSES_ROLLOVER: readonly RedLine[] = [
  { text: "I do not sign agreements that renew themselves." },
];
/** A line with a bound in it: a shape of clause refused, not the clause itself. */
const ACCEPTS_A_SHORT_ONE: readonly RedLine[] = [
  { text: "I will not sign a non-compete longer than six months." },
];

function markedAgainst(
  name: string,
  redLines: readonly RedLine[]
): Promise<AnalysisResult> {
  const fixture = loadFixture(name);
  return analyze(
    { documentText: fixture.text, redLines, jurisdiction: UNDETERMINED_JURISDICTION },
    createStubModelGateway(fixture)
  );
}

const order = (flags: readonly RiskFlag[]): readonly string[] =>
  flags.map((flag) => flag.id);

/** Everything about a flag a Signer's own standard must not be able to move. */
function readingOf(flags: readonly RiskFlag[]) {
  return [...flags]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((flag) => ({
      id: flag.id,
      clauseType: flag.clauseType,
      severity: flag.severity,
      sourceSentence: flag.sourceSentence,
      title: flag.title,
      cost: flag.cost,
      hedged: flag.hedged,
      hedgeNote: flag.hedgeNote,
      unstatedProperties: [...flag.unstatedProperties],
      counterOffer: flag.counterOffer,
    }));
}

describe("the same document under two different standards", () => {
  it("ranks differently, which is the whole of the feature", async () => {
    // The adhesion contract carries four of the eight clause types at once, so the whole
    // ordering is visible in one document.
    const asRedlineSeesIt = await markedAgainst("adhesion-contract.txt", []);
    const restrictions = await markedAgainst("adhesion-contract.txt", REFUSES_RESTRICTIONS);
    const dropped = await markedAgainst("adhesion-contract.txt", REFUSES_BEING_DROPPED);

    // Worst first, with nothing recorded: money already earned, then the assignment, then
    // the restriction, then the exit (`PRD.md` §5).
    expect(order(asRedlineSeesIt.flags)).toEqual([
      "payment-approval-1",
      "ip-assignment-1",
      "non-compete-1",
      "termination-for-convenience-1",
    ]);

    // A Signer who does not sign restrictive covenants meets theirs first, above a
    // severity 4 that Redline itself ranks higher.
    expect(order(restrictions.flags)).toEqual([
      "non-compete-1",
      "payment-approval-1",
      "ip-assignment-1",
      "termination-for-convenience-1",
    ]);

    // A Signer whose line is about being dropped halfway through meets a severity 2
    // first. No re-sort on severity produces this order.
    expect(order(dropped.flags)).toEqual([
      "termination-for-convenience-1",
      "payment-approval-1",
      "ip-assignment-1",
      "non-compete-1",
    ]);

    // Three standards, three orders. Stated as an assertion rather than left implied by
    // the three above, because this is the sentence the ticket is written around.
    const orders = [restrictions, dropped, asRedlineSeesIt].map((result) =>
      order(result.flags).join(" ")
    );
    expect(new Set(orders).size).toBe(3);
  });

  it("moves a severity 2 above three severity 3s, which severity alone cannot do", async () => {
    const asRedlineSeesIt = await markedAgainst("retainer-exposed.txt", []);
    const rollover = await markedAgainst("retainer-exposed.txt", REFUSES_ROLLOVER);

    expect(order(asRedlineSeesIt.flags)).toEqual([
      "unilateral-change-1",
      "one-sided-indemnity-1",
      "uncapped-liability-1",
      "auto-renewal-1",
    ]);
    expect(order(rollover.flags)).toEqual([
      "auto-renewal-1",
      "unilateral-change-1",
      "one-sided-indemnity-1",
      "uncapped-liability-1",
    ]);

    const lifted = rollover.flags[0];
    const others = rollover.flags.slice(1);
    expect(lifted.clauseType).toBe("auto-renewal");
    expect(lifted.severity).toBe(2);
    // At the top of the list with the lowest mark on the page. The two dimensions are
    // visibly different things, which is `docs/adr/0009`'s whole argument.
    for (const other of others) {
      expect(other.severity).toBeGreaterThan(lifted.severity);
    }
  });

  it("returns the same flags either way, because a red line sorts and never filters", async () => {
    for (const name of fixtureNames()) {
      for (const redLines of [
        REFUSES_RESTRICTIONS,
        REFUSES_BEING_DROPPED,
        REFUSES_ROLLOVER,
        ACCEPTS_A_SHORT_ONE,
      ]) {
        const plain = await markedAgainst(name, []);
        const marked = await markedAgainst(name, redLines);

        // Same members, same citations, same marks, same drafted replies. Only the order
        // and the crossings differ, which is what `docs/spec-v1.md` asks for and what an
        // implementation that hid rows would fail.
        expect(readingOf(marked.flags), `${name}: ${redLines[0].text}`).toEqual(
          readingOf(plain.flags)
        );
        // The clean bill is a reading of the document and moves no more than the marks do.
        expect([...marked.checkedClean], name).toEqual([...plain.checkedClean]);
      }
    }
  });

  it("leaves the mark where it was, however strongly the Signer feels about it", async () => {
    // `docs/adr/0003`, restated by `docs/adr/0009`: severity is a fact about the wording,
    // and a Signer's standard is not a fact about the wording. Asserted flag by flag
    // against the corpus's own recorded severities, so this cannot pass by both sides
    // moving together.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      const marked = await markedAgainst(name, [
        ...REFUSES_RESTRICTIONS,
        ...REFUSES_BEING_DROPPED,
        ...REFUSES_ROLLOVER,
      ]);
      for (const clause of fixture.sidecar.planted) {
        const flag = marked.flags.find(
          (found) => found.sourceSentence === clause.sourceSentence
        );
        if (flag === undefined) continue;
        expect(flag.severity, `${name}: ${clause.id} — ${clause.why}`).toBe(
          clause.expectedSeverity
        );
      }
    }
  });
});

describe("a clause Redline reads as standard", () => {
  it("goes to the top for a Signer who will not sign one at all", async () => {
    // The three-month, ten-mile, paid-for restriction in `pair-noncompete-narrow`. Redline
    // marks it 1 and would mark it 1 for anybody; `PRD.md` §5 is explicit that flagging it
    // higher would be crying wolf on the ordinary freelance contract.
    const narrow = await markedAgainst("pair-noncompete-narrow.txt", REFUSES_RESTRICTIONS);
    const [flag] = narrow.flags;

    expect(flag.clauseType).toBe("non-compete");
    expect(flag.severity).toBe(1);
    expect(flag.redLinesCrossed.length).toBe(1);
    // Their own sentence, unchanged, because the claim being made is "you wrote this".
    expect(flag.redLinesCrossed[0].redLine).toBe(REFUSES_RESTRICTIONS[0].text);
    // And the disagreement said out loud, so a mark reading "noted" at the top of the
    // page is explained rather than puzzling.
    expect(flag.redLinesCrossed[0].note).toContain("standard wording");
  });

  it("is left alone by a line that would accept it", async () => {
    // "longer than six months" is a bound, and three months is inside it. The Signer said
    // what they would take; Redline does not put words in their mouth.
    const narrow = await markedAgainst("pair-noncompete-narrow.txt", ACCEPTS_A_SHORT_ONE);
    expect(narrow.flags[0].redLinesCrossed).toEqual([]);

    // The same line against the twenty-four-month, industry-wide, unpaid restriction it
    // was written about.
    const broad = await markedAgainst("pair-noncompete-broad.txt", ACCEPTS_A_SHORT_ONE);
    expect(broad.flags[0].redLinesCrossed.length).toBe(1);
    expect(broad.flags[0].redLinesCrossed[0].redLine).toBe(ACCEPTS_A_SHORT_ONE[0].text);
  });

  it("is untouched by a line about something else entirely", async () => {
    const plain = await markedAgainst("adhesion-contract.txt", []);
    const elsewhere = await markedAgainst("adhesion-contract.txt", [
      { text: "I do not sign agreements that renew themselves." },
    ]);

    // The adhesion contract has no renewal clause in it. A standard that says nothing
    // about what is in front of the Signer changes nothing about what they are shown.
    expect(order(elsewhere.flags)).toEqual(order(plain.flags));
    expect(elsewhere.flags.every((flag) => flag.redLinesCrossed.length === 0)).toBe(true);
  });
});

describe("what a crossing carries", () => {
  it("quotes the Signer's line and the contract's sentence, both verbatim", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const marked = await markedAgainst("adhesion-contract.txt", REFUSES_RESTRICTIONS);
    const [top] = marked.flags;

    expectQuotedVerbatim(fixture.text, top.sourceSentence);
    expect(top.redLinesCrossed[0].redLine).toBe(REFUSES_RESTRICTIONS[0].text);
    expect(top.redLinesCrossed[0].note.trim()).not.toBe("");
  });

  it("keeps the standard a document was marked against, with the marks it produced", async () => {
    const marked = await markedAgainst("adhesion-contract.txt", REFUSES_RESTRICTIONS);
    expect(marked.redLines).toEqual(REFUSES_RESTRICTIONS);
  });

  it("says nothing at all about a Signer who has recorded none", async () => {
    for (const name of fixtureNames()) {
      const plain = await markedAgainst(name, []);
      for (const flag of plain.flags) {
        expect(flag.redLinesCrossed, `${name}: ${flag.id}`).toEqual([]);
      }
    }
  });
});

describe("matching a line to a clause", () => {
  it("ignores an empty line, and reads a repeated one once", () => {
    const repeated = crossingsOf(
      [
        { text: "   " },
        { text: "I do not sign agreements that renew themselves." },
        { text: "I do not sign agreements that renew themselves!" },
      ],
      "auto-renewal",
      []
    );
    expect(repeated.length).toBe(1);
  });

  it("holds a bounded line back until Redline has something to say about the clause", () => {
    // No triggers fired means Redline reads the clause as ordinary. A line with a bound in
    // it has not said it refuses an ordinary one.
    expect(crossingsOf(ACCEPTS_A_SHORT_ONE, "non-compete", [])).toEqual([]);
    expect(crossingsOf(ACCEPTS_A_SHORT_ONE, "non-compete", ["durationMonths"]).length).toBe(1);
    // Where the refusal has no bound in it, the clause being there is enough.
    expect(crossingsOf(REFUSES_RESTRICTIONS, "non-compete", []).length).toBe(1);
  });

  it("does not read a bare preposition as a bound", () => {
    // "under no circumstances" is as absolute as a refusal gets, and "hand over" is a
    // refusal to give something up. Both would read as qualified if `under` and `over`
    // counted as measures.
    for (const wording of [
      "I will not sign a non-compete under any circumstances.",
      "I do not hand over ownership of tools I built before the job.",
    ]) {
      const clauseType = wording.includes("non-compete") ? "non-compete" : "ip-assignment";
      expect(crossingsOf([{ text: wording }], clauseType, []).length, wording).toBe(1);
    }
  });
});

describe("what the Signer is shown", () => {
  function editor(state: RedLinesState, marking = true): string {
    return renderToStaticMarkup(
      createElement(RedLines, {
        state,
        onState: () => {},
        onRevised: () => {},
        working: false,
        marking,
      })
    );
  }

  it("offers a real list: add, change, take off", () => {
    const html = editor({
      status: "held",
      redLines: [
        { id: "a", text: "I do not sign non-competes." },
        { id: "b", text: "I am not paid on someone else's say-so." },
      ],
      problem: null,
    });

    // Their own words, unchanged, so they recognise what they wrote.
    expect(html).toContain("I do not sign non-competes.");
    expect(html).toContain("I am not paid on someone else&#x27;s say-so.");
    // All three moves are on the screen, not only the one that is easy to build.
    expect(html).toContain("Change");
    expect(html).toContain("Take it off");
    expect(html).toContain('id="new-red-line"');
    expect(html).toContain("2 lines");
  });

  it("says out loud that there is no standard yet, rather than showing an empty frame", () => {
    const html = editor({ status: "held", redLines: [], problem: null });

    expect(html).toContain("Nothing set down");
    expect(html).toContain("its own standard");
    expect(html).toContain('id="new-red-line"');
  });

  it("tells a Signer with no account what an account would add, and asks nothing of them", () => {
    const signedOut = editor({ status: "not-signed-in" });
    expect(signedOut).toContain("its own standard");
    expect(signedOut).toContain("/sign-in");
    // Nothing to type into, because there is nowhere to put it.
    expect(signedOut).not.toContain('id="new-red-line"');

    // A deployment with no database is a different thing and is said differently.
    const noDatabase = editor({ status: "accounts-not-set-up" });
    expect(noDatabase).toContain("no database behind it");
    expect(noDatabase).not.toContain("/sign-in");
  });

  it("shows why a mark is at the top, quoting the line the Signer wrote", async () => {
    const fixture = loadFixture("pair-noncompete-narrow.txt");
    const { flags } = await analyze(
      {
        documentText: fixture.text,
        redLines: REFUSES_RESTRICTIONS,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      createStubModelGateway(fixture)
    );
    const html = renderToStaticMarkup(
      createElement(MarkedGalley, { documentText: fixture.text, flags })
    );

    // The index says how it is ordered, so a "noted" mark above a "high" one is explained
    // rather than puzzling.
    expect(html).toContain("Your lines first");
    expect(html).toContain("Crosses a line of yours");
    // And the line itself is quoted, in the Signer's own words.
    expect(html).toContain("I will not sign a non-compete, whatever the length.");
    // The meter still reads what the wording is worth. Both are on the screen because
    // they are two different claims (`docs/adr/0009`).
    expect(html).toContain("severity, 1 of 4");
  });

  it("says nothing about red lines to a Signer who has none", async () => {
    const fixture = loadFixture("pair-noncompete-narrow.txt");
    const { flags } = await analyze(
      { documentText: fixture.text, redLines: [], jurisdiction: UNDETERMINED_JURISDICTION },
      createStubModelGateway(fixture)
    );
    const html = renderToStaticMarkup(
      createElement(MarkedGalley, { documentText: fixture.text, flags })
    );

    expect(html).toContain("Worst first");
    expect(html).not.toContain("Your lines first");
    expect(html).not.toContain("Crosses");
  });
});

describe("the standard the reading is made with", () => {
  /**
   * `docs/spec-v1.md` rules out asserting on prompt text, so this asserts on the function
   * rather than on a prompt: a Signer's words reach the clause reading, and a Signer with
   * nothing recorded changes nothing about it. The ranking above is the other half of
   * "an input, not a post-filter"; this is the half that only matters against a real
   * model, which is unreachable (`.scratch/redline-v1/AGENT-BRIEF.md`) and untested here.
   */
  it("carries the Signer's own words in, and nothing when they have none", () => {
    expect(redLinesBriefing([])).toEqual([]);
    expect(redLinesBriefing([{ text: "  " }])).toEqual([]);

    const briefing = redLinesBriefing(REFUSES_RESTRICTIONS).join("\n");
    expect(briefing).toContain(REFUSES_RESTRICTIONS[0].text);
  });
});
