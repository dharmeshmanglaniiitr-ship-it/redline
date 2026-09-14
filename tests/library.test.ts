/**
 * What the library keeps, and what comes back out of it months later.
 *
 * `docs/adr/0010` settles the question ticket 15 carried: a saved document shows the
 * reading it was saved with, without a model call, and a fresh reading is something the
 * Signer asks for rather than something that happens to them. That decision only means
 * anything if the round trip is lossless, so the first claim here is the blunt one — the
 * reading that comes back is the reading that went in, flag for flag and citation for
 * citation, over the whole corpus.
 *
 * The rest is about what a stored reading may *not* come back as. A row is a place a claim
 * can be damaged: by a hand-written insert, by a half-finished migration, by whatever
 * happens to a database in six months. Every guarantee the types carry in memory has to be
 * re-established on the way out, and the ones that matter are checked here by damaging a
 * stored reading on purpose and watching it be refused rather than drawn:
 *
 * - a citation that is not a sentence of the stored document (`docs/adr/0001`);
 * - a checklist entry reported clean that a stored flag contradicts
 *   (`lib/analysis/checklist.ts` — the brand cannot cross a wire, so this is the test that
 *   the reconstruction is honest rather than a cast);
 * - `hedged` disagreeing with the properties the document left unstated (`docs/adr/0006`);
 * - a counter-offer that no longer carries the wording it replaces.
 *
 * No database is involved and none is needed. This is a pure round trip through JSON, which
 * is exactly what Postgres does to a `jsonb` column, and the analysis it round-trips is a
 * real `analyze()` run over the fixture corpus.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SavedDocument } from "@/app/(app)/library/saved-document";
import { analyze } from "@/lib/analysis/analyze";
import { readBackReading, recordReading, type RecordedReading } from "@/lib/analysis/reading";
import type { AnalysisResult, Jurisdiction, RedLine } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { checklistEntryName } from "@/lib/analysis/wording";

import { fixtureNames, loadFixture } from "./support/fixtures";
import { expectHedgeMatchesProvenance, expectQuotedVerbatim } from "./support/invariants";
import { createStubModelGateway } from "./support/stub-model";

const REFUSES_RESTRICTIONS: readonly RedLine[] = [
  { text: "I will not sign a non-compete, whatever the length." },
];

const READ_UNDER: Jurisdiction = {
  source: "document",
  name: "England and Wales",
  sourceSentence: "This Agreement is governed by the laws of England and Wales.",
};

async function analysisOf(name: string, redLines: readonly RedLine[] = []): Promise<AnalysisResult> {
  const fixture = loadFixture(name);
  return analyze(
    { documentText: fixture.text, redLines, jurisdiction: UNDETERMINED_JURISDICTION },
    createStubModelGateway(fixture)
  );
}

/** What the database does to a reading: JSON in, JSON out, and nothing else survives. */
function throughTheDatabase(reading: RecordedReading): unknown {
  return JSON.parse(JSON.stringify(reading));
}

/** A stored reading with one thing about it damaged, as an insert nobody checked would be. */
function damaged(reading: RecordedReading, change: (stored: Record<string, unknown>) => void): unknown {
  const stored = throughTheDatabase(reading) as Record<string, unknown>;
  change(stored);
  return stored;
}

describe("a reading kept in the library", () => {
  it.each(fixtureNames())("comes back out of %s as the reading that went in", async (name) => {
    const original = await analysisOf(name);
    const fixture = loadFixture(name);

    const read = readBackReading(
      throughTheDatabase(recordReading(original)),
      fixture.text,
      original.jurisdiction
    );

    expect(read.outcome, read.outcome === "unreadable" ? read.problem : "").toBe("read");
    if (read.outcome !== "read") return;

    // Field by field rather than one object comparison, so a failure says which claim was
    // lost rather than printing two contracts side by side.
    expect(read.result.summary).toEqual(original.summary);
    expect(read.result.flags).toEqual(original.flags);
    expect([...read.result.checkedClean]).toEqual([...original.checkedClean]);
    expect(read.result.redLines).toEqual(original.redLines);
  });

  it("keeps every citation checkable against the text it was saved with", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name);
    const read = readBackReading(
      throughTheDatabase(recordReading(original)),
      fixture.text,
      UNDETERMINED_JURISDICTION
    );

    expect(read.outcome).toBe("read");
    if (read.outcome !== "read") return;
    expect(read.result.flags.length).toBeGreaterThan(0);

    for (const flag of read.result.flags) {
      // The same check a Signer makes by hand: find the quoted sentence in their own copy.
      expectQuotedVerbatim(fixture.text, flag.sourceSentence);
      expectHedgeMatchesProvenance(flag);
    }
  });

  it("keeps the standard the document was marked against, and the marks it produced", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name, REFUSES_RESTRICTIONS);
    const crossed = original.flags.filter((flag) => flag.redLinesCrossed.length > 0);
    expect(crossed.length, "the fixture should cross the standing line").toBeGreaterThan(0);

    const read = readBackReading(
      throughTheDatabase(recordReading(original)),
      fixture.text,
      UNDETERMINED_JURISDICTION
    );

    expect(read.outcome).toBe("read");
    if (read.outcome !== "read") return;
    // A red line the Signer has since deleted still stands on the reading it produced.
    expect(read.result.redLines).toEqual([...REFUSES_RESTRICTIONS]);
    expect(read.result.flags.map((flag) => flag.redLinesCrossed)).toEqual(
      original.flags.map((flag) => flag.redLinesCrossed)
    );
    // And the order it put them in, which is what the Signer read down the page.
    expect(read.result.flags.map((flag) => flag.id)).toEqual(original.flags.map((flag) => flag.id));
  });

  it("carries the law it was read under, which the row records separately", async () => {
    const original = await analysisOf("adhesion-contract.txt");
    const read = readBackReading(
      throughTheDatabase(recordReading(original)),
      loadFixture("adhesion-contract.txt").text,
      READ_UNDER
    );

    expect(read.outcome).toBe("read");
    if (read.outcome !== "read") return;
    expect(read.result.jurisdiction).toEqual(READ_UNDER);
  });
});

describe("a stored reading that no longer holds up", () => {
  it("is refused when a flag quotes a sentence the document does not have", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name);

    const tampered = damaged(recordReading(original), (stored) => {
      const flags = stored.flags as Record<string, unknown>[];
      flags[0].sourceSentence = "The Contractor shall be paid promptly and in full.";
    });

    const read = readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION);

    // Not a shorter list. A Signer shown three flags where four were saved has been told
    // something false about their own contract (`docs/adr/0010`).
    expect(read.outcome).toBe("unreadable");
  });

  it("will not report a checklist entry clean that one of its own flags contradicts", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name);
    const flagged = original.flags[0].clauseType;
    expect([...original.checkedClean]).not.toContain(flagged);

    const tampered = damaged(recordReading(original), (stored) => {
      stored.checkedClean = [...(stored.checkedClean as string[]), flagged];
    });

    const read = readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION);

    expect(read.outcome).toBe("read");
    if (read.outcome !== "read") return;
    // The brand is a type and types do not survive Postgres. What survives is that the
    // cleared list is rebuilt from the flags, so the row's claim loses to the flag.
    expect([...read.result.checkedClean]).not.toContain(flagged);
    expect([...read.result.checkedClean]).toEqual([...original.checkedClean]);
  });

  it("is refused when a hedge disagrees with what the document left unstated", async () => {
    const fixture = loadFixture("pair-hedge-silent.txt");
    const original = await analysisOf(fixture.name);
    const hedged = original.flags.find((flag) => flag.hedged);
    expect(hedged, "the silent half of the pair should hedge something").toBeDefined();

    const tampered = damaged(recordReading(original), (stored) => {
      const flags = stored.flags as Record<string, unknown>[];
      const entry = flags.find((flag) => flag.hedged === true);
      if (entry !== undefined) entry.hedged = false;
    });

    expect(readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION).outcome).toBe(
      "unreadable"
    );
  });

  it("is refused when a counter-offer no longer carries the wording it replaces", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name);

    const tampered = damaged(recordReading(original), (stored) => {
      const flags = stored.flags as Record<string, unknown>[];
      const offer = flags[0].counterOffer as Record<string, unknown>;
      offer.text = "Could you take another look at the payment clause?";
    });

    // A message a Signer would paste into a reply to their client. Refused rather than
    // shown, for the reason `lib/analysis/result.ts` makes the tie structural.
    expect(readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION).outcome).toBe(
      "unreadable"
    );
  });

  it("is refused when a flag is about a clause type Redline does not have", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const original = await analysisOf(fixture.name);

    const tampered = damaged(recordReading(original), (stored) => {
      const flags = stored.flags as Record<string, unknown>[];
      flags[0].clauseType = "force-majeure";
    });

    expect(readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION).outcome).toBe(
      "unreadable"
    );
  });

  it("is refused when the summary says nothing", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const original = await analysisOf(fixture.name);

    const tampered = damaged(recordReading(original), (stored) => {
      stored.summary = { sender: "", engagement: "", plainEnglish: "   " };
    });

    // A blank summary would draw as a contract that commits the Signer to nothing, which
    // is the most dangerous thing this product can show (`docs/spec-v1.md`).
    expect(readBackReading(tampered, fixture.text, UNDETERMINED_JURISDICTION).outcome).toBe(
      "unreadable"
    );
  });

  it("is refused when there is nothing stored at all", () => {
    const fixture = loadFixture("balanced-contract.txt");

    for (const nothing of [null, undefined, "", 0, []]) {
      expect(readBackReading(nothing, fixture.text, UNDETERMINED_JURISDICTION).outcome).toBe(
        "unreadable"
      );
    }
  });
});

/**
 * The sheet a returning Signer actually sees.
 *
 * No browser and no testing-library in this repo, so what runs is React's own static
 * renderer over the real component, fed from a real `analyze()` run that has been through
 * the round trip above. That covers the criterion this ticket turns on — **opening a saved
 * document shows its analysis without requiring a re-run** — on the markup that would be
 * served: the findings, their citations and the cleared list are all in the page with no
 * model gateway anywhere in the test.
 *
 * `explainDocument` is imported by the component and never called here. Asking for a fresh
 * reading needs a server and a model, and neither exists in this suite; what is asserted is
 * that the kept reading draws without one.
 */

/** The rendered text with tags and entities removed, for comparing against the document. */
function readable(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

async function renderKept(name: string): Promise<{ text: string; result: AnalysisResult }> {
  const fixture = loadFixture(name);
  const original = await analysisOf(name);
  const read = readBackReading(
    throughTheDatabase(recordReading(original)),
    fixture.text,
    original.jurisdiction
  );
  if (read.outcome !== "read") throw new Error(`the reading did not come back: ${read.problem}`);

  const html = renderToStaticMarkup(
    createElement(SavedDocument, {
      document: { name: fixture.name, format: "text", text: fixture.text },
      keptOn: "3 March 2026",
      reading: { status: "kept", result: read.result, readOn: "3 March 2026" },
    })
  );
  return { text: readable(html), result: read.result };
}

describe("opening a saved document", () => {
  it("shows the marks it was kept with, each still quoting the contract", async () => {
    const { text, result } = await renderKept("adhesion-contract.txt");

    expect(result.flags.length).toBeGreaterThan(0);
    for (const flag of result.flags) {
      expect(text, flag.id).toContain(flag.sourceSentence);
      expect(text, flag.id).toContain(flag.title);
    }
  });

  it("shows what the contract commits the Signer to, and what came back clean", async () => {
    const { text, result } = await renderKept("adhesion-contract.txt");

    expect(text).toContain(result.summary.sender);
    expect(text).toContain(result.summary.engagement);
    for (const entry of result.checkedClean) {
      expect(text, entry).toContain(checklistEntryName(entry));
    }
  });

  it("says it is the reading that was kept, and when it was made", async () => {
    const { text } = await renderKept("adhesion-contract.txt");

    // `docs/adr/0010`: a Signer must be able to tell which reading they are holding
    // without working it out from the content.
    expect(text).toContain("the reading this document was kept with, made 3 March 2026");
    expect(text).toContain("Read it again now");
    expect(text).not.toContain("made just now");
  });

  it("says so plainly when a document was kept with no reading", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const html = renderToStaticMarkup(
      createElement(SavedDocument, {
        document: { name: fixture.name, format: "text", text: fixture.text },
        keptOn: "3 March 2026",
        reading: { status: "none" },
      })
    );
    const text = readable(html);

    // A saved document with an empty report would read as a contract that came back
    // clean, which is the most dangerous thing this product could show.
    expect(text).toContain("No reading was kept with this one");
    expect(text).not.toContain("came back clean");
    // The wording is still there, which is the half that was stored.
    expect(text).toContain(fixture.text.split("\n\n")[0].trim().slice(0, 60));
  });

  it("shows none of a stored reading that no longer checks out, and says why", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const html = renderToStaticMarkup(
      createElement(SavedDocument, {
        document: { name: fixture.name, format: "text", text: fixture.text },
        keptOn: "3 March 2026",
        reading: { status: "unreadable" },
      })
    );
    const text = readable(html);

    expect(text).toContain("does not check out against the wording");
    expect(text).not.toContain("came back clean");
  });
});
