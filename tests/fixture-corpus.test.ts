/**
 * The corpus checking itself.
 *
 * These tests run over the fixtures rather than over the analysis, which does not exist
 * yet. They exist because every later ticket asserts against what is recorded here: if a
 * sidecar's quoted sentence is not really in its contract, or a pair differs in two
 * places, or the balanced contract has aggressive language left in it, then the citation
 * and severity tests built on top are testing the wrong thing and passing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CHECKLIST_ENTRIES,
  FIXTURE_PAIRS,
  SETTLED_CLAUSE_TYPES,
  fixtureNames,
  loadBinaryFixture,
  loadFixture,
  type ClauseType,
  type Severity,
} from "./support/fixtures";
import {
  expectChecklistReported,
  expectHedgeMatchesProvenance,
  expectQuotedVerbatim,
  expectRanksAbove,
} from "./support/invariants";

const FIXTURE_DIR = fileURLToPath(new URL("./fixtures/", import.meta.url));

const fixtures = fixtureNames().map((name) => loadFixture(name));

describe("the fixture corpus", () => {
  // First in the file on purpose. This is ADR 0001's rule turned on the fixtures
  // themselves: if the sidecars do not quote their own contracts exactly, every later
  // citation test is built on sand.
  it("quotes every planted clause character for character from its own contract", () => {
    let checked = 0;
    for (const fixture of fixtures) {
      for (const clause of fixture.sidecar.planted) {
        expect(
          fixture.text,
          `${fixture.name} does not contain the sentence recorded for "${clause.id}"`
        ).toContain(clause.sourceSentence);
        expect(
          fixture.sentences,
          `"${clause.id}" in ${fixture.name} is not a whole sentence by splitIntoSentences`
        ).toContain(clause.sourceSentence);
        expectQuotedVerbatim(fixture.text, clause.sourceSentence);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("quotes every governing-law sentence character for character as well", () => {
    for (const fixture of fixtures) {
      const { expected, sourceSentence } = fixture.sidecar.jurisdiction;
      if (sourceSentence === null) {
        // ADR 0007: undetermined is a real state, and it is never guessed from an
        // address or a currency. This fixture has UK addresses and no governing law.
        expect(expected).toBe("undetermined");
        continue;
      }
      expectQuotedVerbatim(fixture.text, sourceSentence);
    }
  });

  it("covers each settled clause type at its dangerous threshold", () => {
    const dangerous = new Map<ClauseType, Severity>();
    for (const fixture of fixtures) {
      for (const clause of fixture.sidecar.planted) {
        if (!clause.mustBeFlagged) continue;
        const worst = dangerous.get(clause.clauseType) ?? 1;
        dangerous.set(
          clause.clauseType,
          clause.expectedSeverity > worst ? clause.expectedSeverity : worst
        );
      }
    }
    expect([...dangerous.keys()].sort()).toEqual([...SETTLED_CLAUSE_TYPES].sort());
    expect(dangerous.get("payment-approval")).toBe(4);
    expect(dangerous.get("ip-assignment")).toBe(3);
    expect(dangerous.get("non-compete")).toBe(3);
    expect(dangerous.get("termination-for-convenience")).toBe(2);
  });

  it("keeps the sidecar's hedge in step with what the document leaves unstated", () => {
    for (const fixture of fixtures) {
      for (const clause of fixture.sidecar.planted) {
        expectHedgeMatchesProvenance({
          hedged: clause.expectedHedged,
          unstatedProperties: clause.unstatedProperties,
        });
      }
    }
  });

  it("names only real checklist entries as checked and clean", () => {
    for (const fixture of fixtures) {
      for (const entry of fixture.sidecar.expectedCleanChecklist) {
        expectChecklistReported([...CHECKLIST_ENTRIES], entry);
      }
    }
  });

  it("asks questions the contract genuinely does not answer", () => {
    for (const fixture of fixtures) {
      const haystack = fixture.text.toLowerCase();
      for (const question of fixture.sidecar.unanswerableQuestions) {
        const missing = distinctiveWords(question).filter((word) => !haystack.includes(word));
        expect(
          missing,
          `${fixture.name} uses every distinctive word in "${question}", so it may well answer it`
        ).not.toHaveLength(0);
      }
    }
  });
});

describe("the adhesion contract", () => {
  const fixture = loadFixture("adhesion-contract.txt");
  const planted = byId(fixture.sidecar.planted);

  it("ranks subjective payment above IP overreach above termination for convenience", () => {
    const payment = { severity: planted("payment-subjective").expectedSeverity };
    const ip = { severity: planted("ip-overreaching").expectedSeverity };
    const termination = { severity: planted("termination-no-kill-fee").expectedSeverity };

    expectRanksAbove(payment, ip);
    expectRanksAbove(ip, termination);
    // Story 12 states the ordering that matters, so state it end to end too.
    expectRanksAbove(payment, termination);
  });

  it("carries a governing-law clause for jurisdiction detection to find", () => {
    expect(fixture.sidecar.jurisdiction.expected).toBe("England and Wales");
    expectQuotedVerbatim(fixture.text, fixture.sidecar.jurisdiction.sourceSentence ?? "");
  });
});

describe("the balanced contract", () => {
  const fixture = loadFixture("balanced-contract.txt");

  it("plants nothing at all", () => {
    expect(fixture.sidecar.planted).toEqual([]);
  });

  it("still names things it checked, so a quiet report means someone looked", () => {
    // PRD §4 test 4: zero high-severity flags is only half the claim. An empty
    // checklist alongside it is indistinguishable from not having looked.
    expect(fixture.sidecar.expectedCleanChecklist.length).toBeGreaterThan(4);
    for (const entry of ["payment-approval", "non-compete", "termination-for-convenience"]) {
      expectChecklistReported([...fixture.sidecar.expectedCleanChecklist], entry);
    }
  });

  it("has no language left in it that would earn a severity 3 or 4 flag", () => {
    // The four settled dangerous thresholds, as the phrases that carry them. A stray
    // one of these is the way a "balanced" fixture quietly stops being balanced.
    const aggressive = [
      "sole and absolute discretion",
      "sole discretion",
      "to its satisfaction",
      "shall not provide",
      "shall not perform",
      "pre-existing tools",
      "for any reason or for none",
    ];
    const haystack = fixture.text.toLowerCase();
    for (const phrase of aggressive) {
      expect(haystack, `balanced-contract.txt still contains "${phrase}"`).not.toContain(phrase);
    }
  });
});

describe("the paired fixtures", () => {
  it.each(FIXTURE_PAIRS)("%s and %s differ in exactly one line", (left, right) => {
    const leftLines = linesOf(left);
    const rightLines = linesOf(right);

    expect(leftLines.length).toBe(rightLines.length);
    const differing = leftLines
      .map((line, index) => (line === rightLines[index] ? -1 : index))
      .filter((index) => index >= 0);
    expect(differing).toHaveLength(1);
  });

  it.each(FIXTURE_PAIRS)(
    "%s and %s differ only where the planted clause sits",
    (left, right) => {
      const leftFixture = loadFixture(left);
      const rightFixture = loadFixture(right);
      const leftLines = linesOf(left);
      const rightLines = linesOf(right);
      const index = leftLines.findIndex((line, i) => line !== rightLines[i]);

      expect(leftFixture.sidecar.planted[0].sourceSentence).toBe(leftLines[index]);
      expect(rightFixture.sidecar.planted[0].sourceSentence).toBe(rightLines[index]);
      expect(leftFixture.sidecar.planted[0].clauseType).toBe(
        rightFixture.sidecar.planted[0].clauseType
      );
    }
  );

  it("gives the IP pair materially different severities from the same clause type", () => {
    const bounded = loadFixture("pair-ip-bounded.txt").sidecar.planted[0];
    const overreaching = loadFixture("pair-ip-overreaching.txt").sidecar.planted[0];

    expect(bounded.clauseType).toBe(overreaching.clauseType);
    expect(bounded.properties.reachesBeyondDeliverable).toBe(false);
    expect(overreaching.properties.reachesBeyondDeliverable).toBe(true);
    expectRanksAbove(
      { severity: overreaching.expectedSeverity },
      { severity: bounded.expectedSeverity }
    );
    expect(overreaching.mustBeFlagged).toBe(true);
  });

  it("gives the non-compete pair materially different severities from the same clause type", () => {
    const narrow = loadFixture("pair-noncompete-narrow.txt").sidecar.planted[0];
    const broad = loadFixture("pair-noncompete-broad.txt").sidecar.planted[0];

    expect(narrow.clauseType).toBe(broad.clauseType);
    expect(narrow.properties.compensated).toBe(true);
    expect(broad.properties.compensated).toBe(false);
    expect(Number(narrow.properties.durationMonths)).toBeLessThan(
      Number(broad.properties.durationMonths)
    );
    expectRanksAbove({ severity: broad.expectedSeverity }, { severity: narrow.expectedSeverity });
  });

  it("hedges the half whose contract is silent, and only that half", () => {
    const stated = loadFixture("pair-hedge-stated.txt").sidecar.planted[0];
    const silent = loadFixture("pair-hedge-silent.txt").sidecar.planted[0];

    expect(stated.unstatedProperties).toEqual([]);
    expect(stated.expectedHedged).toBe(false);
    expect(silent.unstatedProperties).toEqual(["compensated"]);
    expect(silent.expectedHedged).toBe(true);
    // ADR 0006: a hedge is a statement about the basis of a finding, never a softening
    // of it. The unstated property is assumed at its dangerous end, so severity holds.
    expect(silent.expectedSeverity).toBe(stated.expectedSeverity);
  });
});

describe("the unreadable scan", () => {
  const pdf = loadBinaryFixture("unreadable-scan.pdf").toString("latin1");

  it("is a PDF a reader will open", () => {
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("/Type /Page");
    expect(pdf).toContain("trailer");
  });

  it("draws one image and nothing else", () => {
    expect(pdf).toContain("/Subtype /Image");
    expect(pdf).toContain("/Im0 Do");
  });

  it("has no text layer, so a parser gets nothing out of it", () => {
    // The point of this fixture is the most dangerous failure the product has: a
    // document that was never read coming back as a clean bill. If someone ever
    // regenerates this file with a text layer, this is what catches it.
    const textOperators = pdf.match(/(?<![A-Za-z0-9])(BT|ET|Tj|TJ)(?![A-Za-z0-9])/g);
    expect(textOperators).toBeNull();
    expect(pdf).not.toContain("/Font");
    // The ' and " operators show text too; neither character occurs in this file.
    expect(pdf).not.toContain("'");
    expect(pdf).not.toContain('"');
  });
});

function linesOf(name: string): string[] {
  return readFileSync(FIXTURE_DIR + name, "utf8").split(/\r?\n/);
}

function byId(planted: ReturnType<typeof loadFixture>["sidecar"]["planted"]) {
  return (id: string) => {
    const clause = planted.find((entry) => entry.id === id);
    if (clause === undefined) {
      throw new Error(`no planted clause with id "${id}"`);
    }
    return clause;
  };
}

const STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "agreement",
  "another",
  "before",
  "client",
  "contract",
  "contractor",
  "could",
  "does",
  "happens",
  "have",
  "must",
  "their",
  "there",
  "this",
  "under",
  "what",
  "when",
  "where",
  "which",
  "would",
]);

/**
 * The words in a question that would have to appear in a contract that answered it.
 * Short words and the words every one of these contracts uses carry no signal.
 */
function distinctiveWords(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5 && !STOPWORDS.has(word));
}
