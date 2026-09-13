/**
 * The analysis seam, driven the way `docs/spec-v1.md` says a good test drives it:
 * document text in, structure out, with no browser, no network and no API key.
 *
 * Nothing here asserts on prompt text, on which model answered, or on the order of
 * internal calls — those change without the behaviour changing. What is asserted is what
 * a Signer is owed: the Sender is named and the name is really in their contract, the
 * engagement is identified, a different contract produces a different account of itself,
 * the jurisdiction the analysis assumed is recorded rather than defaulted, and the
 * result carries the flags, checklist and counter-offers the later tickets return
 * through instead of being widened for them.
 *
 * The gateway is injected, so the stub built from each fixture's sidecar stands in for
 * the model. The two hand-built gateways below are the same idea narrowed to one bad
 * answer: they exercise the seam's own refusal, which is the thing under test there.
 */

import { describe, expect, it } from "vitest";

import { analyze } from "@/lib/analysis/analyze";
import type { PropertyValue, SeverityProperty } from "@/lib/analysis/clauses";
import type { Jurisdiction, RedLine, RiskFlag } from "@/lib/analysis/result";
import {
  UNDETERMINED_JURISDICTION,
  assumedJurisdictionName,
} from "@/lib/analysis/result";
import type { JsonObject, ModelGateway } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { fixtureNames, loadFixture, type PlantedClause } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";
import {
  expectHedgeMatchesProvenance,
  expectQuotedVerbatim,
  expectRankedWorstFirst,
  expectRanksAbove,
} from "./support/invariants";

const NO_RED_LINES: readonly RedLine[] = [];

/** Run the analysis over one fixture with that fixture's own stub behind it. */
async function analyzeFixture(
  name: string,
  jurisdiction: Jurisdiction = UNDETERMINED_JURISDICTION,
  redLines: readonly RedLine[] = NO_RED_LINES
) {
  const fixture = loadFixture(name);
  const result = await analyze(
    { documentText: fixture.text, redLines, jurisdiction },
    createStubModelGateway(fixture)
  );
  return { fixture, result };
}

describe("analyze", () => {
  it("names the Sender and identifies the engagement for every contract in the corpus", async () => {
    for (const name of fixtureNames()) {
      const { fixture, result } = await analyzeFixture(name);
      const where = `${name}:`;

      expect(result.summary.sender, where).toBe(fixture.sidecar.sender);
      expect(result.summary.engagement, where).toBe(fixture.sidecar.engagement);
      expect(result.summary.plainEnglish.trim(), where).not.toBe("");

      // The name is not just present in the answer, it is present in the contract the
      // answer was made from. Compared on letters and digits, the way the seam does.
      expect(comparable(fixture.text), where).toContain(comparable(result.summary.sender));
    }
  });

  it("reads a different contract differently, rather than returning one fixed account", async () => {
    const aggressive = await analyzeFixture("adhesion-contract.txt");
    const fair = await analyzeFixture("balanced-contract.txt");

    expect(fair.result.summary.sender).not.toBe(aggressive.result.summary.sender);
    expect(fair.result.summary.engagement).not.toBe(aggressive.result.summary.engagement);
    expect(fair.result.summary.plainEnglish).not.toBe(aggressive.result.summary.plainEnglish);
  });

  it("refuses a summary naming a Sender the document never names", async () => {
    const fixture = loadFixture("balanced-contract.txt");

    await expect(
      analyze(
        {
          documentText: fixture.text,
          redLines: NO_RED_LINES,
          jurisdiction: UNDETERMINED_JURISDICTION,
        },
        gatewayAnswering({
          summary: {
            sender: "Ashcombe Dynamics Incorporated",
            engagement: fixture.sidecar.engagement,
            plainEnglish: "Someone sent you a contract.",
          },
        })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);
  });

  it("refuses an answer that is missing a piece of the summary", async () => {
    const fixture = loadFixture("balanced-contract.txt");

    await expect(
      analyze(
        {
          documentText: fixture.text,
          redLines: NO_RED_LINES,
          jurisdiction: UNDETERMINED_JURISDICTION,
        },
        gatewayAnswering({
          summary: { sender: fixture.sidecar.sender, engagement: "", plainEnglish: "" },
        })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);
  });

  it("reports nothing checked as nothing checked, never as a contract with nothing wrong in it", async () => {
    // The adhesion contract has four dangerous clauses planted in it. Until ticket 08
    // looks for them the analysis has no findings to report, and it reports none —
    // rather than an invented one, and rather than a clean bill it has not earned.
    const { result } = await analyzeFixture("adhesion-contract.txt");

    expect(result.flags).toEqual([]);
    expect(result.checkedClean).toEqual([]);
  });

  it("records the jurisdiction it assumed rather than defaulting to one", async () => {
    const undetermined = await analyzeFixture("balanced-contract.txt");
    expect(undetermined.result.jurisdiction.source).toBe("undetermined");
    expect(assumedJurisdictionName(undetermined.result.jurisdiction)).toBeNull();

    // Detected from the document's own governing-law clause, carrying that clause.
    const detected = await analyzeFixture("balanced-contract.txt", {
      source: "document",
      name: undetermined.fixture.sidecar.jurisdiction.expected,
      sourceSentence: undetermined.fixture.sidecar.jurisdiction.sourceSentence ?? "",
    });
    expect(assumedJurisdictionName(detected.result.jurisdiction)).toBe("Scotland");
    if (detected.result.jurisdiction.source !== "document") throw new Error("not carried");
    expectQuotedVerbatim(detected.fixture.text, detected.result.jurisdiction.sourceSentence);

    // The Signer outranks the document, and the detection they overrode is kept.
    const chosen = await analyzeFixture("balanced-contract.txt", {
      source: "signer",
      name: "Ireland",
      detected: { name: "Scotland", sourceSentence: "governed by the law of Scotland" },
    });
    expect(assumedJurisdictionName(chosen.result.jurisdiction)).toBe("Ireland");
  });

  it("keeps the red lines the document was marked against", async () => {
    const strict: readonly RedLine[] = [
      { text: "I never assign rights in anything I made before the job started." },
      { text: "I am not bound by a restriction I am not paid for." },
    ];
    const none = await analyzeFixture("pair-noncompete-broad.txt");
    const standard = await analyzeFixture(
      "pair-noncompete-broad.txt",
      UNDETERMINED_JURISDICTION,
      strict
    );

    expect(none.result.redLines).toEqual([]);
    expect(standard.result.redLines).toEqual(strict);
  });

  it("carries a flag and its counter-offer in a shape the corpus's own expectations fit", async () => {
    // Ticket 08 fills `flags` and ticket 11 fills `counterOffer`. What this proves is
    // that they extend this result rather than reshape it: a clause the corpus planted,
    // written out as a flag, satisfies every invariant the suite already asserts —
    // required citation, severity within a pair, and ADR 0006's hedge.
    const broad = loadFixture("pair-noncompete-broad.txt");
    const narrow = loadFixture("pair-noncompete-narrow.txt");
    const silent = loadFixture("pair-hedge-silent.txt");

    const flags: readonly RiskFlag[] = [
      nonCompeteFlag(broad.sidecar.planted[0]),
      nonCompeteFlag(narrow.sidecar.planted[0]),
    ];

    expectRankedWorstFirst(flags);
    expectRanksAbove(flags[0], flags[1]);
    expectQuotedVerbatim(broad.text, flags[0].sourceSentence);
    expectQuotedVerbatim(narrow.text, flags[1].sourceSentence);
    for (const flag of flags) {
      expectHedgeMatchesProvenance(flag);
      expect(flag.counterOffer?.replaces).toBe(flag.sourceSentence);
    }

    const hedged = nonCompeteFlag(silent.sidecar.planted[0]);
    expectHedgeMatchesProvenance(hedged);
    expect(hedged.hedged).toBe(true);
    expect(hedged.hedgeNote).toContain(hedged.unstatedProperties[0]);
  });
});

/**
 * A gateway with one answer in it, for the cases where the answer itself is what the
 * seam has to refuse. It runs the caller's own `parse`, exactly as a real client does,
 * so what is under test is the seam's narrowing rather than anything written here.
 */
function gatewayAnswering(payload: JsonObject): ModelGateway {
  return {
    async complete(request) {
      return request.response.parse(payload);
    },
  };
}

/** One planted non-compete, written out as the flag ticket 08 will produce. */
function nonCompeteFlag(clause: PlantedClause): RiskFlag {
  expect(clause.clauseType).toBe("non-compete");
  const unstated = clause.unstatedProperties as readonly SeverityProperty<"non-compete">[];

  return {
    id: clause.id,
    clauseType: "non-compete",
    sourceSentence: clause.sourceSentence,
    severity: clause.expectedSeverity,
    title: "What you cannot do after this ends",
    cost: "the kind of work you do now is closed off after this engagement ends",
    properties: clause.properties as Readonly<
      Partial<Record<SeverityProperty<"non-compete">, PropertyValue>>
    >,
    unstatedProperties: unstated,
    hedged: unstated.length > 0,
    hedgeNote:
      unstated.length > 0 ? `The contract does not say ${unstated.join(" or ")}.` : null,
    counterOffer: {
      replaces: clause.sourceSentence,
      text: "Cut the restriction to three months, limit it to the work in Schedule 1, and pay for it.",
    },
  };
}

function comparable(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
