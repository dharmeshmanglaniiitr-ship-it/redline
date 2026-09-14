/**
 * Risk flags, driven through `analyze()` over the whole fixture corpus.
 *
 * The gateway is the fixture-backed stub, so what varies between these runs is the
 * contract, not the model. That is the point: the stub hands back clause readings taken
 * from each sidecar — type, sentence, stated properties — and nothing else. Every
 * severity, every title, every cost, every hedge and the whole ordering is computed in
 * `lib/analysis/`, so a test that sees two fixtures ranked differently has seen the
 * analysis do it, not the stub.
 *
 * The stub's payload carries a `severity` number, which this seam never reads. One test
 * below turns that into an assertion by handing the seam a deliberately wrong number.
 *
 * The live model is unreachable — every OpenRouter call comes back 429 from the pinned
 * provider's shared pool — so none of this has been checked against a real model, and
 * nothing here should be read as saying it has.
 */

import { describe, expect, it } from "vitest";

import { analyze } from "@/lib/analysis/analyze";
import { SETTLED_CLAUSE_TYPES, SEVERITY_PROPERTIES } from "@/lib/analysis/clauses";
import type { Jurisdiction, RedLine, RiskFlag } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import type { JsonObject, ModelGateway } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import {
  CHECKLIST_ENTRIES,
  FIXTURE_PAIRS,
  fixtureNames,
  loadFixture,
  type Fixture,
  type PlantedClause,
} from "./support/fixtures";
import {
  expectHedgeMatchesProvenance,
  expectQuotedVerbatim,
  expectRankedWorstFirst,
} from "./support/invariants";

const NO_RED_LINES: readonly RedLine[] = [];

async function flagsFor(
  name: string,
  jurisdiction: Jurisdiction = UNDETERMINED_JURISDICTION
): Promise<{ fixture: Fixture; flags: readonly RiskFlag[] }> {
  const fixture = loadFixture(name);
  const { createStubModelGateway } = await import("./support/stub-model");
  const result = await analyze(
    { documentText: fixture.text, redLines: NO_RED_LINES, jurisdiction },
    createStubModelGateway(fixture)
  );
  return { fixture, flags: result.flags };
}

/** The flag carrying a planted clause's own sentence, or undefined if it was not flagged. */
function flagOf(flags: readonly RiskFlag[], clause: PlantedClause): RiskFlag | undefined {
  return flags.find((flag) => flag.sourceSentence === clause.sourceSentence);
}

describe("risk flags", () => {
  it("stops reporting an unexamined contract as a contract with nothing in it", async () => {
    // Four dangerous clauses are planted in this fixture at their dangerous threshold.
    // Before this ticket the analysis returned none of them.
    const { flags } = await flagsFor("adhesion-contract.txt");
    expect(flags.length).toBeGreaterThan(0);
  });

  it("quotes every flag's source sentence verbatim, across the whole corpus", async () => {
    // `PRD.md` §4 test 1, at 100% with no tolerance. Any single failure here is a defect
    // rather than a degradation, so the assertion is per flag and the count is checked
    // afterwards to prove the loop had something to look at.
    let checked = 0;
    for (const name of fixtureNames()) {
      const { fixture, flags } = await flagsFor(name);
      for (const flag of flags) {
        expectQuotedVerbatim(fixture.text, flag.sourceSentence);
        expect(fixture.sentences, `${name}: ${flag.id}`).toContain(flag.sourceSentence);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("flags every clause the corpus planted as one that must be flagged", async () => {
    // `PRD.md` §4 test 3. Recall is the tight constraint: over-flagging is a cost a
    // Signer can check and dismiss in a second, because every flag carries the sentence
    // it came from. A missed clause is a cost they find out about later.
    for (const name of fixtureNames()) {
      const { fixture, flags } = await flagsFor(name);
      for (const clause of fixture.sidecar.planted) {
        if (!clause.mustBeFlagged) continue;
        expect(
          flagOf(flags, clause),
          `${name} did not flag the planted clause "${clause.id}"`
        ).toBeDefined();
      }
    }
  });

  it("gives each planted clause the severity the corpus records for it", async () => {
    // Not a restatement of the stub. The stub supplies properties; the severity is
    // `deriveSeverity`'s, derived from those properties in code (`docs/adr/0003`).
    for (const name of fixtureNames()) {
      const { fixture, flags } = await flagsFor(name);
      for (const clause of fixture.sidecar.planted) {
        const flag = flagOf(flags, clause);
        if (flag === undefined) continue;
        expect(flag.severity, `${name}: ${clause.id} — ${clause.why}`).toBe(
          clause.expectedSeverity
        );
      }
    }
  });

  it("ranks flags worst first", async () => {
    for (const name of fixtureNames()) {
      const { flags } = await flagsFor(name);
      expectRankedWorstFirst(flags);
    }

    // The adhesion contract carries all four settled clause types at once, so it is the
    // one fixture where the whole ordering is visible: money already earned above future
    // opportunity, and the restriction on future work above a clean exit (`PRD.md` §5).
    const { flags } = await flagsFor("adhesion-contract.txt");
    expect(flags.map((flag) => flag.clauseType)).toEqual([
      "payment-approval",
      "ip-assignment",
      "non-compete",
      "termination-for-convenience",
    ]);
    expect(flags.map((flag) => flag.severity)).toEqual([4, 3, 3, 2]);
    // The two threes are left in the order the Signer meets them when they scroll their
    // own contract: clause 5.2 before clause 9.1.
    expect(flags[1].sourceSentence.startsWith("5.2")).toBe(true);
    expect(flags[2].sourceSentence.startsWith("9.1")).toBe(true);
  });

  it("hedges exactly when the document left a severity-determining property unstated", async () => {
    // `docs/adr/0006`'s invariant, asserted in both directions over every flag in the
    // corpus, plus the requirement that the hedge names the gap in words rather than in
    // identifiers.
    for (const name of fixtureNames()) {
      const { flags } = await flagsFor(name);
      for (const flag of flags) {
        expectHedgeMatchesProvenance(flag);
        expect(flag.hedged, `${name}: ${flag.id}`).toBe(flag.unstatedProperties.length > 0);
        expect(flag.hedgeNote === null, `${name}: ${flag.id}`).toBe(!flag.hedged);

        // Read through a plain record so one loop can cover every clause type. The
        // types already forbid a flag carrying another type's properties; what is under
        // test here is that the gap and the values agree.
        const stated: Readonly<Record<string, unknown>> = flag.properties;
        for (const property of flag.unstatedProperties) {
          // A hedge can only name a property its own clause type's severity consumed.
          expect(SEVERITY_PROPERTIES[flag.clauseType]).toContain(property);
          expect(stated[property]).toBeUndefined();
          // ...and it has to name it in words a person reads, not as an identifier.
          expect(flag.hedgeNote ?? "").not.toContain(property);
        }
        if (flag.hedged) {
          expect(flag.hedgeNote?.length ?? 0).toBeGreaterThan(20);
        }
      }
    }
  });

  it("says what each clause would cost, in terms that are not just its name", async () => {
    // User story 8. A flag that only names the clause type tells a Signer nothing they
    // could act on, so the cost has to be real prose and it has to differ from the title.
    for (const name of fixtureNames()) {
      const { flags } = await flagsFor(name);
      for (const flag of flags) {
        expect(flag.title.trim(), `${name}: ${flag.id}`).not.toBe("");
        expect(flag.cost.length, `${name}: ${flag.id}`).toBeGreaterThan(80);
        expect(flag.cost).not.toBe(flag.title);
        expect(flag.cost).not.toContain(flag.clauseType);
      }
    }
  });

  it("gives every flag an id of its own within its document", async () => {
    for (const name of fixtureNames()) {
      const { flags } = await flagsFor(name);
      const ids = flags.map((flag) => flag.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it("carries a drafted counter-offer on every flag it returns", async () => {
    // The field was null until ticket 11 rather than holding a placeholder, because a
    // placeholder redraft is a thing a Signer would paste into a reply to their client.
    // Now a flag without one is the failure. What the redraft says is asserted in
    // `tests/counter-offers.test.ts`; this is the seam's half of it.
    const { flags } = await flagsFor("adhesion-contract.txt");
    expect(flags.length).toBeGreaterThan(0);
    for (const flag of flags) {
      expect(flag.counterOffer, flag.id).not.toBeNull();
      expect(flag.counterOffer?.replaces).toBe(flag.sourceSentence);
    }
  });
});

describe("the paired fixtures", () => {
  // `PRD.md` §4 test 2, and the test that separates a real analysis from a category
  // lookup. Each pair is two copies of the same contract differing in one clause, so a
  // category lookup returns the same answer for both halves and fails here.

  it("reads the same IP clause differently depending on how far it reaches", async () => {
    const bounded = await flagsFor("pair-ip-bounded.txt");
    const overreaching = await flagsFor("pair-ip-overreaching.txt");

    const low = bounded.flags.find((flag) => flag.clauseType === "ip-assignment");
    const high = overreaching.flags.find((flag) => flag.clauseType === "ip-assignment");
    if (low === undefined || high === undefined) throw new Error("the pair lost a flag");

    expect(high.severity).toBeGreaterThan(low.severity);
    expect(high.severity).toBe(3);
    expect(low.severity).toBe(1);
    // Different wording, not just a different number: the two halves say different
    // things about what the Signer loses.
    expect(high.title).not.toBe(low.title);
    expect(high.cost).not.toBe(low.cost);
  });

  it("reads the same restriction differently depending on its length, breadth and pay", async () => {
    const narrow = await flagsFor("pair-noncompete-narrow.txt");
    const broad = await flagsFor("pair-noncompete-broad.txt");

    const low = narrow.flags.find((flag) => flag.clauseType === "non-compete");
    const high = broad.flags.find((flag) => flag.clauseType === "non-compete");
    if (low === undefined || high === undefined) throw new Error("the pair lost a flag");

    expect(high.severity).toBeGreaterThan(low.severity);
    expect(high.severity).toBe(3);
    expect(low.severity).toBe(1);
    expect(high.title).not.toBe(low.title);
    expect(high.cost).not.toBe(low.cost);
  });

  it("reads the four newly settled clause types at both ends of their own thresholds", async () => {
    // `docs/adr/0008` end to end. Two copies of one retainer differing in four lines,
    // each line a planted clause of a different type, so a category lookup returns the
    // same answer for both halves and fails on all four at once.
    const exposed = await flagsFor("retainer-exposed.txt");
    const bounded = await flagsFor("retainer-bounded.txt");

    const expected: Record<string, number> = {
      "one-sided-indemnity": 3,
      "uncapped-liability": 3,
      "unilateral-change": 3,
      "auto-renewal": 2,
    };

    for (const [clauseType, severity] of Object.entries(expected)) {
      const high = exposed.flags.find((flag) => flag.clauseType === clauseType);
      const low = bounded.flags.find((flag) => flag.clauseType === clauseType);
      if (high === undefined || low === undefined) {
        throw new Error(`the retainer pair lost ${clauseType}`);
      }

      expect(high.severity, clauseType).toBe(severity);
      expect(low.severity, clauseType).toBe(1);
      // Different wording, not just a different number: the two halves say different
      // things about what the Signer is being asked to carry.
      expect(high.title, clauseType).not.toBe(low.title);
      expect(high.cost, clauseType).not.toBe(low.cost);
    }
  });

  it("attributes the legal claims on the newly settled clauses instead of asserting them", async () => {
    // `docs/adr/0007` names three claims that live on these clauses: whether a cap or an
    // indemnity is limited or overridden by statute, and whether a renewal needs its own
    // notice to be effective. None may be stated as universal fact. The unilateral change
    // carries no legal claim at all, so it carries no attribution either.
    const exposed = loadFixture("retainer-exposed.txt");
    const named = await flagsFor("retainer-exposed.txt", {
      source: "document",
      name: exposed.sidecar.jurisdiction.expected,
      sourceSentence: exposed.sidecar.jurisdiction.sourceSentence ?? "",
    });
    const unknown = await flagsFor("retainer-exposed.txt");

    for (const clauseType of ["one-sided-indemnity", "uncapped-liability", "auto-renewal"]) {
      const withLaw = named.flags.find((flag) => flag.clauseType === clauseType);
      const withoutLaw = unknown.flags.find((flag) => flag.clauseType === clauseType);

      expect(withLaw?.cost, clauseType).toContain("Ireland");
      expect(withoutLaw?.cost, clauseType).not.toContain("Ireland");
      expect(withoutLaw?.cost, clauseType).toContain("law governing this contract");
      // Severity is a fact about the wording, so naming the law changes none of it.
      expect(withLaw?.severity, clauseType).toBe(withoutLaw?.severity);
    }

    const change = named.flags.find((flag) => flag.clauseType === "unilateral-change");
    expect(change?.cost).not.toContain("Ireland");
    expect(change?.cost).not.toContain("law");
  });

  it("separates the halves of the hedging pair by what the contract left out, not by rank", async () => {
    // The third pair isolates provenance rather than scope, so the material difference
    // is the hedge and not the severity: `docs/adr/0006` requires that an unstated
    // property is read at its dangerous end, which puts both halves on the same step.
    // A pair that differed in severity here would mean a hedge had lowered a finding.
    const stated = await flagsFor("pair-hedge-stated.txt");
    const silent = await flagsFor("pair-hedge-silent.txt");

    const plain = stated.flags.find((flag) => flag.clauseType === "non-compete");
    const hedged = silent.flags.find((flag) => flag.clauseType === "non-compete");
    if (plain === undefined || hedged === undefined) throw new Error("the pair lost a flag");

    expect(hedged.severity).toBe(plain.severity);
    expect(plain.hedged).toBe(false);
    expect(plain.hedgeNote).toBeNull();
    expect(hedged.hedged).toBe(true);
    expect(hedged.unstatedProperties).toEqual(["compensated"]);
    expect(hedged.hedgeNote).not.toBeNull();
    expect(hedged.hedgeNote).toContain("paid");

    // And the cost differs on the one thing the pair changed. `compensated` fires on both
    // halves, because an unstated property is read at its dangerous end (`docs/adr/0006`),
    // but the two are different facts: one contract says the restriction is unpaid and the
    // other says nothing about payment at all. Writing "you are paid nothing" over the
    // silent half would be the product stating what the document does not
    // (`CLAUDE.md`), and the hedge underneath is not there to take that back.
    expect(hedged.cost).not.toBe(plain.cost);
    expect(plain.cost).toMatch(/paid nothing/i);
    expect(hedged.cost).not.toMatch(/paid nothing|pays you nothing/i);
  });

  it("differs materially on every pair, and on nothing the pair did not change", async () => {
    // Run over `FIXTURE_PAIRS` rather than over three hand-named pairs, so a pair added
    // to the corpus is covered here without this file being edited.
    for (const [narrower, broader] of FIXTURE_PAIRS) {
      const low = await flagsFor(narrower);
      const high = await flagsFor(broader);

      const differs = describable(high.flags) !== describable(low.flags);
      expect(differs, `${narrower} and ${broader} were read identically`).toBe(true);
      // Neither half of a pair may come back with nothing to say.
      expect(low.flags.length, narrower).toBeGreaterThan(0);
      expect(high.flags.length, broader).toBeGreaterThan(0);
    }
  });
});

describe("the seam's refusals", () => {
  it("drops a flag whose quote is a paraphrase, and shows no caveat in its place", async () => {
    // `docs/adr/0001`. The reading is materially right and the quote is not in the
    // document, so nothing is reported. Not a flag with a warning on it: nothing.
    const fixture = loadFixture("adhesion-contract.txt");
    const result = await analyze(
      {
        documentText: fixture.text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering({
        summary: summaryOf(fixture),
        findings: [
          {
            clauseType: "payment-approval",
            sourceSentence:
              "No invoice is payable until the Client decides, in its sole discretion, that the Deliverable is satisfactory.",
            properties: { acceptanceStandard: "subjective" },
          },
        ],
      })
    );

    expect(result.flags).toEqual([]);
  });

  it("keeps the verifiable flags out of the same answer the unverifiable one was in", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const real = fixture.sidecar.planted[0];
    const result = await analyze(
      {
        documentText: fixture.text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering({
        summary: summaryOf(fixture),
        findings: [
          {
            clauseType: "non-compete",
            sourceSentence: "The Contractor shall not work for anyone else, ever.",
            properties: {},
          },
          {
            clauseType: real.clauseType,
            sourceSentence: real.sourceSentence,
            properties: { ...real.properties },
          },
        ],
      })
    );

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].sourceSentence).toBe(real.sourceSentence);
  });

  it("ignores a severity the answer volunteered and derives its own", async () => {
    // The seam never reads a severity number. Here the answer calls the worst clause in
    // the corpus a 1; it comes back a 4, because the properties say so (`docs/adr/0003`).
    const fixture = loadFixture("adhesion-contract.txt");
    const payment = fixture.sidecar.planted[0];
    const result = await analyze(
      {
        documentText: fixture.text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering({
        summary: summaryOf(fixture),
        findings: [
          {
            clauseType: "payment-approval",
            sourceSentence: payment.sourceSentence,
            severity: 1,
            properties: { acceptanceStandard: "subjective" },
          },
        ],
      })
    );

    expect(result.flags[0].severity).toBe(4);
  });

  it("derives the gap itself rather than believing a claim that nothing was missing", async () => {
    // `docs/adr/0006` holds by construction: `unstatedProperties` comes from the
    // properties that arrived, so an answer asserting an empty gap over a half-read
    // clause does not get one.
    const fixture = loadFixture("pair-hedge-silent.txt");
    const clause = fixture.sidecar.planted[0];
    const result = await analyze(
      {
        documentText: fixture.text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering({
        summary: summaryOf(fixture),
        findings: [
          {
            clauseType: "non-compete",
            sourceSentence: clause.sourceSentence,
            hedged: false,
            unstatedProperties: [],
            properties: { ...clause.properties },
          },
        ],
      })
    );

    expect(result.flags[0].unstatedProperties).toEqual(["compensated"]);
    expect(result.flags[0].hedged).toBe(true);
  });

  it("refuses an answer whose findings are not clause readings at all", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const badAnswers: JsonObject[] = [
      { summary: summaryOf(fixture), findings: "none" },
      {
        summary: summaryOf(fixture),
        findings: [{ clauseType: "mystery-clause", sourceSentence: "x", properties: {} }],
      },
      {
        summary: summaryOf(fixture),
        // A flag cannot be constructed without its source sentence — not as an empty
        // string, and not by leaving the field out.
        findings: [{ clauseType: "non-compete", sourceSentence: "", properties: {} }],
      },
      {
        summary: summaryOf(fixture),
        findings: [{ clauseType: "non-compete", properties: {} }],
      },
    ];

    for (const answer of badAnswers) {
      await expect(
        analyze(
          {
            documentText: fixture.text,
            redLines: NO_RED_LINES,
            jurisdiction: UNDETERMINED_JURISDICTION,
          },
          gatewayAnswering(answer)
        )
      ).rejects.toBeInstanceOf(ModelResponseError);
    }
  });

  it("reports a contract with none of the four clause types as having none", async () => {
    // The other half of `PRD.md` §4 test 4. Zero flags is a real answer here, and it is
    // reached by reading the document rather than by not looking — the same seam that
    // produces four flags on the adhesion contract produces none on this one.
    const { flags } = await flagsFor("balanced-contract.txt");
    expect(flags).toEqual([]);
  });

  it("names the governing law when there is one, and withholds the claim when there is not", async () => {
    // `docs/adr/0005` and `docs/adr/0007`: whether a restriction holds up is a question
    // for a jurisdiction, so it is never answered as universal fact. This is attribution
    // rather than a hedge, and the two compose.
    const broad = loadFixture("pair-noncompete-broad.txt");
    const named = await flagsFor("pair-noncompete-broad.txt", {
      source: "document",
      name: broad.sidecar.jurisdiction.expected,
      sourceSentence: broad.sidecar.jurisdiction.sourceSentence ?? "",
    });
    const unknown = await flagsFor("pair-noncompete-broad.txt");

    const withLaw = named.flags.find((flag) => flag.clauseType === "non-compete");
    const withoutLaw = unknown.flags.find((flag) => flag.clauseType === "non-compete");

    expect(withLaw?.cost).toContain("England and Wales");
    expect(withoutLaw?.cost).not.toContain("England and Wales");
    expect(withoutLaw?.cost).toContain("law governing this contract");
    // Severity is not a function of jurisdiction. Only the wording changes.
    expect(withLaw?.severity).toBe(withoutLaw?.severity);
  });

  it("covers every settled clause type across the corpus", async () => {
    const found = new Set<string>();
    for (const name of fixtureNames()) {
      const { flags } = await flagsFor(name);
      for (const flag of flags) found.add(flag.clauseType);
    }
    expect([...found].sort()).toEqual([...SETTLED_CLAUSE_TYPES].sort());
  });
});

/**
 * A gateway with one answer in it, running the caller's own `parse` as a client does.
 *
 * The checklist examination is answered in full underneath, because `analyze()` refuses
 * an examination that skips an entry (`tests/checked-clean.test.ts`) and these tests are
 * about the findings, not about that refusal.
 */
function gatewayAnswering(payload: JsonObject): ModelGateway {
  const sound: JsonObject = {
    checklist: CHECKLIST_ENTRIES.map((entry) => ({ entry, cleared: true })),
  };
  return {
    async complete(request) {
      return request.response.parse({ ...sound, ...payload });
    },
  };
}

function summaryOf(fixture: Fixture): JsonObject {
  return {
    sender: fixture.sidecar.sender,
    engagement: fixture.sidecar.engagement,
    plainEnglish: "Someone sent you a contract.",
  };
}

/** Everything about a set of flags that a Signer would notice changing. */
function describable(flags: readonly RiskFlag[]): string {
  return JSON.stringify(
    flags.map((flag) => [flag.severity, flag.title, flag.cost, flag.hedgeNote])
  );
}
