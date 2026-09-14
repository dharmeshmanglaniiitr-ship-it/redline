/**
 * Which law the analysis reads under: detected, corrected, or genuinely not known.
 *
 * `docs/adr/0007` settles the mechanism and this is where it is held to. Four claims are
 * worth more than the rest, and they are the ones a wrong implementation would quietly
 * break:
 *
 * - **A detection carries the sentence it came from, verbatim.** It goes through the same
 *   `createCitationVerifier` every flag goes through, so a jurisdiction quoted from a
 *   sentence the contract does not contain is not a detection at all.
 * - **Nothing is inferred from circumstance.** `pair-hedge-stated` and
 *   `pair-hedge-silent` are Manchester contracts, priced in sterling, carrying a
 *   restriction across the whole United Kingdom, with no governing-law clause anywhere in
 *   them. The right answer on both is that Redline does not know, and the corpus carries
 *   them for exactly this test.
 * - **Severity does not move.** Under `docs/adr/0003` severity comes from properties of
 *   the wording, which are textual facts, and `docs/adr/0007` says so in as many words.
 *   The same contract read under two different laws produces the same marks in the same
 *   order with the same citations. This is the invariant easiest to break by accident
 *   here, so it is asserted flag by flag.
 * - **Legal claims name a jurisdiction or withhold themselves.** Never a claim with no
 *   owner, and never the United States by default.
 *
 * The last describe block renders the real component, the way `tests/cleared-list.test.ts`
 * does, because "surfaced to the Signer" is a claim about a screen and not about a data
 * structure.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoverningLaw, assumedLawLegend } from "@/app/(app)/review/governing-law";
import { analyze } from "@/lib/analysis/analyze";
import { detectJurisdiction, determineJurisdiction } from "@/lib/analysis/jurisdiction";
import type { AnalysisResult, Jurisdiction, RiskFlag } from "@/lib/analysis/result";
import { assumedJurisdictionName } from "@/lib/analysis/result";
import type { JsonValue, ModelGateway, ModelRequest } from "@/lib/model/types";

import { fixtureNames, loadFixture, type Fixture } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";
import { expectQuotedVerbatim } from "./support/invariants";

/** The two fixtures written to catch a detector that guesses from context. */
const NO_GOVERNING_LAW = ["pair-hedge-stated.txt", "pair-hedge-silent.txt"] as const;

/**
 * What the review screen's server action does, in the order it does it: read the
 * governing law, apply `docs/adr/0007`'s precedence, then analyse under the answer.
 *
 * `app/(app)/review/actions.ts` is these three lines plus the things only a server can do
 * — reading the environment and building the gateway — so driving them here with the
 * fixture stub exercises the same path with no key and no network.
 */
async function review(
  name: string,
  signerChoice: string | null = null
): Promise<{ fixture: Fixture; jurisdiction: Jurisdiction; result: AnalysisResult }> {
  const fixture = loadFixture(name);
  const gateway = createStubModelGateway(fixture);
  const detected = await detectJurisdiction(fixture.text, gateway);
  const jurisdiction = determineJurisdiction(detected, signerChoice);
  const result = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction },
    gateway
  );
  return { fixture, jurisdiction, result };
}

/** A gateway that answers every request with one fixed payload, for the refusal cases. */
function gatewayAnswering(payload: JsonValue): ModelGateway {
  return {
    async complete<Shape>(request: ModelRequest<Shape>): Promise<Shape> {
      return request.response.parse(payload);
    },
  };
}

/** Everything about a flag that a jurisdiction must not be able to move. */
function textualFactsOf(flags: readonly RiskFlag[]) {
  return flags.map((flag) => ({
    id: flag.id,
    clauseType: flag.clauseType,
    severity: flag.severity,
    sourceSentence: flag.sourceSentence,
    title: flag.title,
    hedged: flag.hedged,
    unstatedProperties: [...flag.unstatedProperties],
    counterOffer: flag.counterOffer,
  }));
}

describe("reading the governing law out of the document", () => {
  it("finds the clause and carries the sentence it came from, verbatim", async () => {
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      const expected = fixture.sidecar.jurisdiction;
      if (expected.expected === "undetermined") continue;

      const detected = await detectJurisdiction(
        fixture.text,
        createStubModelGateway(fixture)
      );
      if (detected === null) throw new Error(`${name}: the governing-law clause went unread`);

      expect(detected.name, name).toBe(expected.expected);
      // The same check a flag's citation gets: a whole sentence of this document,
      // character for character (`docs/adr/0001`).
      expectQuotedVerbatim(fixture.text, detected.sourceSentence);
      expect(detected.sourceSentence, name).toBe(expected.sourceSentence);
    }
  });

  it("reports nothing on a contract with no governing-law clause, however much circumstance surrounds it", async () => {
    for (const name of NO_GOVERNING_LAW) {
      const fixture = loadFixture(name);

      // The trap has to still be baited, or this test passes for the wrong reason. Both
      // fixtures are full of things a locale-guessing detector would take for an answer.
      expect(fixture.text, name).toContain("Manchester");
      expect(fixture.text, name).toContain("United Kingdom");
      expect(fixture.text, name).toContain("£");
      expect(fixture.text.toLowerCase(), name).not.toContain("governed by");

      const detected = await detectJurisdiction(
        fixture.text,
        createStubModelGateway(fixture)
      );
      expect(detected, name).toBeNull();
      expect(determineJurisdiction(detected, null).source, name).toBe("undetermined");
    }
  });

  it("throws away a jurisdiction quoted from a sentence the document does not contain", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const real = fixture.sidecar.jurisdiction.sourceSentence ?? "";

    const invented = await detectJurisdiction(
      fixture.text,
      gatewayAnswering({
        jurisdiction: {
          name: "California",
          sourceSentence:
            "This Agreement is governed by the laws of the State of California.",
        },
      })
    );
    expect(invented).toBeNull();

    // Half of the real clause is not the real clause. A Signer searching their own copy
    // for the quoted string is the whole point, and a fragment is a different string.
    const halved = await detectJurisdiction(
      fixture.text,
      gatewayAnswering({
        jurisdiction: { name: "Scotland", sourceSentence: real.slice(0, 40) },
      })
    );
    expect(halved).toBeNull();
  });

  it("treats a name with no sentence, and a sentence with no name, as no answer", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const real = fixture.sidecar.jurisdiction.sourceSentence ?? "";

    expect(
      await detectJurisdiction(
        fixture.text,
        gatewayAnswering({ jurisdiction: { name: "Scotland", sourceSentence: null } })
      )
    ).toBeNull();

    expect(
      await detectJurisdiction(
        fixture.text,
        gatewayAnswering({ jurisdiction: { name: null, sourceSentence: real } })
      )
    ).toBeNull();

    // A model writing "unknown" into the field is saying the field should have been
    // empty, and "the law of unknown" is not something to put in front of anybody.
    expect(
      await detectJurisdiction(
        fixture.text,
        gatewayAnswering({ jurisdiction: { name: "not specified", sourceSentence: real } })
      )
    ).toBeNull();
  });

  it("never answers the United States for a contract that does not say so", async () => {
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      const detected = await detectJurisdiction(
        fixture.text,
        createStubModelGateway(fixture)
      );
      if (detected === null) continue;
      if (/United States|New York|California/.test(fixture.text)) continue;
      expect(detected.name, name).not.toMatch(/United States|New York|California/);
    }
  });
});

describe("whose answer wins", () => {
  const detection = { name: "Scotland", sourceSentence: "Governed by the law of Scotland." };

  it("gives the Signer the last word, and keeps the detection they overrode", () => {
    const chosen = determineJurisdiction(detection, "Ireland");

    expect(chosen.source).toBe("signer");
    expect(assumedJurisdictionName(chosen)).toBe("Ireland");
    if (chosen.source !== "signer") throw new Error("the Signer's answer was not taken");
    // Both, not one. A contract sending disputes a long way from where somebody works is
    // a term of the deal, so the clause they overrode stays on the screen.
    expect(chosen.detected).toEqual(detection);
  });

  it("takes the document's answer when the Signer has not given one", () => {
    expect(determineJurisdiction(detection, null)).toEqual({
      source: "document",
      name: "Scotland",
      sourceSentence: detection.sourceSentence,
    });
  });

  it("is undetermined when neither has an answer, and never the United States", () => {
    expect(determineJurisdiction(null, null)).toEqual({ source: "undetermined" });
    expect(assumedJurisdictionName(determineJurisdiction(null, null))).toBeNull();
  });

  it("reads a cleared box as going back to the document rather than as a law called nothing", () => {
    expect(determineJurisdiction(detection, "   ").source).toBe("document");
    expect(determineJurisdiction(null, "").source).toBe("undetermined");
  });
});

describe("the analysis under a governing law", () => {
  it("runs the whole reading under the law the document itself names", async () => {
    const { fixture, jurisdiction, result } = await review("retainer-exposed.txt");

    expect(jurisdiction.source).toBe("document");
    expect(assumedJurisdictionName(result.jurisdiction)).toBe("Ireland");
    if (result.jurisdiction.source !== "document") throw new Error("not carried");
    expectQuotedVerbatim(fixture.text, result.jurisdiction.sourceSentence);
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("still analyses a contract whose governing law is unknown", async () => {
    // `docs/adr/0007`: refusing to read a contract with no governing-law clause would be
    // hostile and is not what the Signer came for. It degrades in one place only.
    const { result } = await review("pair-hedge-silent.txt");

    expect(result.jurisdiction.source).toBe("undetermined");
    expect(result.summary.sender.trim()).not.toBe("");
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.checkedClean.length).toBeGreaterThan(0);
  });

  it("re-runs under the law the Signer corrects it to, overriding the contract's own", async () => {
    const fromDocument = await review("retainer-exposed.txt");
    const corrected = await review("retainer-exposed.txt", "Ontario");

    expect(assumedJurisdictionName(fromDocument.result.jurisdiction)).toBe("Ireland");
    expect(assumedJurisdictionName(corrected.result.jurisdiction)).toBe("Ontario");
    if (corrected.result.jurisdiction.source !== "signer") throw new Error("not the Signer's");
    expect(corrected.result.jurisdiction.detected?.name).toBe("Ireland");

    // The correction reaches the findings, which is the whole point of making it.
    const before = fromDocument.result.flags.find((f) => f.clauseType === "uncapped-liability");
    const after = corrected.result.flags.find((f) => f.clauseType === "uncapped-liability");
    expect(before?.cost).toContain("Ireland");
    expect(after?.cost).toContain("Ontario");
    expect(after?.cost).not.toContain("Ireland");
  });

  it("keeps every mark exactly where it was when the law changes", async () => {
    // `docs/adr/0003`, restated by `docs/adr/0007`: severity is a fact about the wording.
    // Reading the same sentences under a different law does not change what they say.
    // Three contracts, and `pair-hedge-stated` among them so that one of the three
    // readings is genuinely made under no law at all rather than merely a different one.
    for (const name of [
      "retainer-exposed.txt",
      "pair-noncompete-broad.txt",
      "pair-hedge-stated.txt",
    ]) {
      const asFound = await review(name, null);
      const irish = await review(name, "Ireland");
      const ontarian = await review(name, "Ontario");

      const baseline = textualFactsOf(asFound.result.flags);
      expect(baseline.length, name).toBeGreaterThan(0);
      expect(textualFactsOf(irish.result.flags), name).toEqual(baseline);
      expect(textualFactsOf(ontarian.result.flags), name).toEqual(baseline);
      // The clean bill is a reading of the text too, and moves no more than the marks do.
      expect([...irish.result.checkedClean], name).toEqual([...asFound.result.checkedClean]);
    }
  });
});

describe("claims that turn on the law", () => {
  /** The claims `docs/adr/0007` names that these eight clause types actually make. */
  const ATTRIBUTED = [
    "non-compete",
    "one-sided-indemnity",
    "uncapped-liability",
    "auto-renewal",
  ] as const;

  /** Words that assert a legal effect. None may stand in a finding without an owner. */
  const LEGAL_EFFECT = /enforced|enforceable|statute|set aside|cut back|overridden/i;

  it("names the jurisdiction, and names a different one when the law is different", async () => {
    const irish = await review("retainer-exposed.txt", "Ireland");
    const ontarian = await review("retainer-exposed.txt", "Ontario");

    for (const clauseType of ATTRIBUTED) {
      const here = irish.result.flags.find((flag) => flag.clauseType === clauseType);
      const there = ontarian.result.flags.find((flag) => flag.clauseType === clauseType);
      if (here === undefined || there === undefined) continue;

      expect(here.cost, clauseType).toContain("law of Ireland");
      expect(there.cost, clauseType).toContain("law of Ontario");
      expect(here.cost, clauseType).not.toBe(there.cost);
      // Different sentence, same mark. The legal claim moved; the reading did not.
      expect(here.severity, clauseType).toBe(there.severity);
    }
  });

  it("withholds the claim rather than guessing it when no law is known", async () => {
    // A contract that names no governing law, which is the state this rule is for.
    const { result } = await review("pair-hedge-silent.txt");
    expect(result.jurisdiction.source).toBe("undetermined");
    expect(result.flags.length).toBeGreaterThan(0);

    for (const flag of result.flags) {
      if (!LEGAL_EFFECT.test(flag.cost)) continue;
      // Present but unanswered, and said to be unanswered. Never asserted, and never
      // quietly answered from somewhere the Signer did not choose.
      expect(flag.cost, flag.clauseType).toContain("turns on the law governing this contract");
      expect(flag.cost, flag.clauseType).toContain("nothing here names one");
    }
  });

  it("says nothing about enforceability of a restriction until it knows whose law decides", async () => {
    // The claim `docs/adr/0005` was written about: "often unenforceable" is a US-informed
    // reading and is not a fact anywhere else.
    // The same contract twice: once as it arrives, naming no governing law, and once
    // after the Signer has said where they are signing.
    const unknown = await review("pair-hedge-stated.txt");
    const named = await review("pair-hedge-stated.txt", "England and Wales");
    expect(unknown.result.jurisdiction.source).toBe("undetermined");

    const withoutLaw = unknown.result.flags.find((flag) => flag.clauseType === "non-compete");
    const withLaw = named.result.flags.find((flag) => flag.clauseType === "non-compete");
    if (withoutLaw === undefined || withLaw === undefined) {
      throw new Error("the broad restriction went unflagged");
    }

    expect(withoutLaw.cost).toContain("Whether it would be enforced turns on the law");
    expect(withoutLaw.cost).not.toMatch(/England|United States|often unenforceable/);
    expect(withLaw.cost).toContain("question for the law of England and Wales");
    expect(withLaw.severity).toBe(withoutLaw.severity);
  });

  it("leaves a finding that makes no legal claim carrying no attribution", async () => {
    // `docs/adr/0008` decided the unilateral change asks no legal question, so it answers
    // none and names no law. The complement matters as much as the rule.
    const { result } = await review("retainer-exposed.txt", "Ireland");
    const change = result.flags.find((flag) => flag.clauseType === "unilateral-change");

    expect(change?.cost).not.toContain("Ireland");
    expect(change?.cost).not.toMatch(LEGAL_EFFECT);
  });
});

describe("what the Signer is shown", () => {
  function render(jurisdiction: Jurisdiction): string {
    return renderToStaticMarkup(
      createElement(GoverningLaw, { jurisdiction, working: false, onSet: () => {} })
    );
  }

  it("says out loud that the law is not known, rather than leaving it off the page", () => {
    const html = render({ source: "undetermined" });

    expect(html).toContain("does not know");
    expect(html).toContain("has not picked one");
    expect(assumedLawLegend({ source: "undetermined" })).toBe("Governing law not known");
    // The one word that must never appear where nothing was established.
    expect(html).not.toContain("United States");
  });

  it("shows a detected law beside the sentence it was read out of", async () => {
    const { fixture, jurisdiction } = await review("retainer-exposed.txt");
    const html = render(jurisdiction);

    expect(html).toContain("Ireland");
    if (jurisdiction.source !== "document") throw new Error("not a detection");
    expect(html).toContain(jurisdiction.sourceSentence);
    expectQuotedVerbatim(fixture.text, jurisdiction.sourceSentence);
  });

  it("shows both the Signer's answer and the one it overrode", async () => {
    const { jurisdiction } = await review("retainer-exposed.txt", "Ontario");
    const html = render(jurisdiction);

    expect(html).toContain("Ontario");
    expect(html).toContain("Ireland");
    expect(assumedLawLegend(jurisdiction)).toContain("Ontario");
  });

  it("offers the correction in every state, including the one where it already knows", async () => {
    const states: Jurisdiction[] = [
      { source: "undetermined" },
      (await review("retainer-exposed.txt")).jurisdiction,
      (await review("retainer-exposed.txt", "Ontario")).jurisdiction,
    ];

    for (const jurisdiction of states) {
      const html = render(jurisdiction);
      expect(html, jurisdiction.source).toContain('id="governing-law"');
      expect(html, jurisdiction.source).toContain("Read it again");
    }
  });
});
