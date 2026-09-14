/**
 * The clean bill, driven through `analyze()` over the whole fixture corpus.
 *
 * `PRD.md` §4 test 4 and `docs/spec-v1.md`'s fourth testing decision both put the same
 * condition on this list, and it has two halves that have to hold at once: a genuinely
 * balanced contract yields zero high-severity flags *and* a populated checked-clean
 * list. Zero flags with an empty checklist is indistinguishable from not having looked
 * at all, so the first test here asserts both in one place rather than in two tests that
 * could pass on different days.
 *
 * The rest of the file is about what makes that list a claim rather than a courtesy
 * (`docs/adr/0004`):
 *
 * - nothing is reported clean that is also flagged, over every contract in the corpus;
 * - an examination that skips an entry is refused outright, because a clean bill one
 *   line short still renders as a clean bill;
 * - a clean claim the findings contradict loses to the findings.
 *
 * The gateway is the fixture-backed stub, so what varies between runs is the contract.
 * The live model is unreachable — every OpenRouter call comes back 429 from the pinned
 * provider's shared pool — so none of this has been checked against a real model.
 */

import { describe, expect, it } from "vitest";

import { analyze } from "@/lib/analysis/analyze";
import type { ChecklistEntry } from "@/lib/analysis/clauses";
import type { AnalysisResult, RedLine } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { checklistEntryName } from "@/lib/analysis/wording";
import type { JsonObject, JsonValue, ModelGateway } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { CHECKLIST_ENTRIES, fixtureNames, loadFixture } from "./support/fixtures";
import { expectChecklistReported } from "./support/invariants";
import { createStubModelGateway } from "./support/stub-model";

const NO_RED_LINES: readonly RedLine[] = [];

/** The highest severities `PRD.md` §5 defines: the ones a fair contract must not earn. */
const HIGH_SEVERITY = 3;

async function analyzeFixture(name: string): Promise<AnalysisResult> {
  const fixture = loadFixture(name);
  return analyze(
    {
      documentText: fixture.text,
      redLines: NO_RED_LINES,
      jurisdiction: UNDETERMINED_JURISDICTION,
    },
    createStubModelGateway(fixture)
  );
}

/**
 * A gateway that answers with one payload, for the cases where the answer itself is what
 * the seam has to deal with. The summary is the fixture's own so it survives its
 * narrowing; everything else is whatever the test supplies.
 */
function gatewayAnswering(fixtureName: string, payload: JsonObject): ModelGateway {
  const { sidecar } = loadFixture(fixtureName);
  const sound: JsonObject = {
    summary: {
      sender: sidecar.sender,
      engagement: sidecar.engagement,
      plainEnglish: "Someone sent you a contract.",
    },
    findings: [],
    checklist: checklistAnswer(CHECKLIST_ENTRIES),
  };
  return {
    async complete(request) {
      return request.response.parse({ ...sound, ...payload });
    },
  };
}

/** An examination answering these entries and no others, as JSON. */
function checklistAnswer(
  entries: readonly ChecklistEntry[],
  cleared = true
): readonly JsonValue[] {
  return entries.map((entry) => ({ entry, cleared }));
}

describe("the checked-clean list", () => {
  it("tells a fair contract it is fair, by name, with nothing manufactured to fill the space", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const result = await analyzeFixture("balanced-contract.txt");

    // Half one: no high-severity finding, and no low-severity one invented to avoid
    // looking idle either. This document has nothing planted in it.
    expect(result.flags.filter((flag) => flag.severity >= HIGH_SEVERITY)).toEqual([]);
    expect(result.flags).toEqual([]);

    // Half two: the checklist is populated, entry by entry rather than by length,
    // because a list of the wrong entries would pass a length check.
    expect(result.checkedClean.length).toBeGreaterThan(0);
    for (const entry of fixture.sidecar.expectedCleanChecklist) {
      expectChecklistReported(result.checkedClean, entry);
    }
    expect([...result.checkedClean]).toEqual([...fixture.sidecar.expectedCleanChecklist]);

    // Seven of eight, not eight: `PRD.md` §5 lets a bounded IP assignment be flagged at
    // severity 1 rather than reported clean, and the corpus leaves it off deliberately.
    expect(result.checkedClean).not.toContain("ip-assignment");
  });

  it("names every entry in words a Signer can act on, never a clause-type identifier", () => {
    for (const entry of CHECKLIST_ENTRIES) {
      const name = checklistEntryName(entry);
      expect(name, entry).not.toBe(entry);
      expect(name, entry).not.toMatch(/-/);
      // Long enough to say what was checked. "IP" would pass a non-empty check and tell
      // a Signer nothing about what Redline went looking for.
      expect(name.split(" ").length, entry).toBeGreaterThan(3);
    }
  });

  it("never reports an entry clean that it also flagged, across the whole corpus", async () => {
    for (const name of fixtureNames()) {
      const result = await analyzeFixture(name);
      const flagged = new Set<string>(result.flags.map((flag) => flag.clauseType));
      const overlap = result.checkedClean.filter((entry) => flagged.has(entry));

      expect(overlap, `${name}: reported clean and flagged at once`).toEqual([]);
    }
  });

  it("reports exactly the entries the corpus expects clean, for every contract in it", async () => {
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      const result = await analyzeFixture(name);

      expect([...result.checkedClean], name).toEqual([
        ...fixture.sidecar.expectedCleanChecklist,
      ]);
      for (const entry of result.checkedClean) {
        expect(CHECKLIST_ENTRIES, name).toContain(entry);
      }
    }
  });

  it("refuses an examination that leaves an entry out, rather than shipping a shorter clean bill", async () => {
    const skipped: ChecklistEntry = "auto-renewal";

    await expect(
      analyze(
        {
          documentText: loadFixture("balanced-contract.txt").text,
          redLines: NO_RED_LINES,
          jurisdiction: UNDETERMINED_JURISDICTION,
        },
        gatewayAnswering("balanced-contract.txt", {
          checklist: checklistAnswer(
            CHECKLIST_ENTRIES.filter((entry) => entry !== skipped)
          ),
        })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);

    // The control: the same answer with every entry present comes back as a clean bill,
    // so what was refused above is the missing line and not the shape of the answer.
    const whole = await analyze(
      {
        documentText: loadFixture("balanced-contract.txt").text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering("balanced-contract.txt", {})
    );
    expect([...whole.checkedClean]).toEqual([...CHECKLIST_ENTRIES]);
  });

  it("refuses an examination that answers the same entry twice, or answers off the checklist", async () => {
    const document = {
      documentText: loadFixture("balanced-contract.txt").text,
      redLines: NO_RED_LINES,
      jurisdiction: UNDETERMINED_JURISDICTION,
    };

    await expect(
      analyze(
        document,
        gatewayAnswering("balanced-contract.txt", {
          checklist: [
            ...checklistAnswer(CHECKLIST_ENTRIES),
            { entry: "auto-renewal", cleared: false },
          ],
        })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);

    await expect(
      analyze(
        document,
        gatewayAnswering("balanced-contract.txt", {
          checklist: [
            ...checklistAnswer(CHECKLIST_ENTRIES),
            { entry: "arbitration", cleared: true },
          ],
        })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);
  });

  it("drops a clean claim the findings contradict, rather than relaying it", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const planted = fixture.sidecar.planted[0];

    // The examination says everything is clear. The flags pass, reading the same
    // contract, produces a finding against one of those entries. The finding wins, and
    // it wins in code — nothing in the answer had to be consistent for this to hold.
    const result = await analyze(
      {
        documentText: fixture.text,
        redLines: NO_RED_LINES,
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      gatewayAnswering("adhesion-contract.txt", {
        findings: [
          {
            clauseType: planted.clauseType,
            sourceSentence: planted.sourceSentence,
            properties: { ...planted.properties },
          },
        ],
      })
    );

    expect(result.flags.map((flag) => flag.clauseType)).toEqual([planted.clauseType]);
    expect(result.checkedClean).not.toContain(planted.clauseType);
    expect([...result.checkedClean]).toEqual(
      CHECKLIST_ENTRIES.filter((entry) => entry !== planted.clauseType)
    );
  });

  it("lets a finding overturn a clean claim on the four entries that could not make one", async () => {
    // Ticket 09 shipped these four as checklist members with no severity rule, which left
    // a hole it recorded honestly: a clause found under one of them landed in neither
    // list, because there was no flag to contradict the clean claim with.
    // `docs/adr/0008` closes it, and this is the half that has to be shown rather than
    // asserted — `clearedList` subtracts these the same way it subtracts the others, with
    // no change to `lib/analysis/checklist.ts`.
    const fixture = loadFixture("retainer-exposed.txt");
    const settledLate: readonly ChecklistEntry[] = [
      "one-sided-indemnity",
      "uncapped-liability",
      "auto-renewal",
      "unilateral-change",
    ];

    for (const entry of settledLate) {
      const planted = fixture.sidecar.planted.find((clause) => clause.clauseType === entry);
      if (planted === undefined) throw new Error(`nothing planted under ${entry}`);

      // The examination says all eight are clear. The flags pass, reading the same
      // contract, finds this one.
      const result = await analyze(
        {
          documentText: fixture.text,
          redLines: NO_RED_LINES,
          jurisdiction: UNDETERMINED_JURISDICTION,
        },
        gatewayAnswering("retainer-exposed.txt", {
          findings: [
            {
              clauseType: planted.clauseType,
              sourceSentence: planted.sourceSentence,
              properties: { ...planted.properties },
            },
          ],
        })
      );

      expect(result.flags.map((flag) => flag.clauseType), entry).toEqual([entry]);
      expect(result.checkedClean, entry).not.toContain(entry);
      expect([...result.checkedClean], entry).toEqual(
        CHECKLIST_ENTRIES.filter((name) => name !== entry)
      );
    }
  });
});
