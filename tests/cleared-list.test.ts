/**
 * The clean bill, rendered.
 *
 * Same arrangement as `tests/marked-galley.test.ts`: no browser and no testing-library in
 * this repo, so what runs is React's own static renderer over the real component, fed
 * from a real `analyze()` run. That covers the part of this screen that is a claim rather
 * than taste — that a Signer is told what was checked, in words, and that the raw entry
 * identifiers never reach the page.
 *
 * What it cannot cover is layout: the two-column break at 640px and the hairline rules
 * are Tailwind classes here, not measured boxes.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClearedList } from "@/app/(app)/review/cleared-list";
import { analyze } from "@/lib/analysis/analyze";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { checklistEntryName } from "@/lib/analysis/wording";

import { CHECKLIST_ENTRIES, loadFixture } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";

async function renderFixture(name: string): Promise<string> {
  const fixture = loadFixture(name);
  const { checkedClean } = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction: UNDETERMINED_JURISDICTION },
    createStubModelGateway(fixture)
  );
  return renderToStaticMarkup(createElement(ClearedList, { cleared: checkedClean }));
}

describe("the cleared list on the screen", () => {
  it("names what was checked, in words, for a contract that came back clean", async () => {
    const html = await renderFixture("balanced-contract.txt");
    const { expectedCleanChecklist } = loadFixture("balanced-contract.txt").sidecar;

    for (const entry of expectedCleanChecklist) {
      expect(html, entry).toContain(checklistEntryName(entry));
    }
    // The entry Redline did not clear is not on the list, and neither is its name.
    expect(html).not.toContain(checklistEntryName("ip-assignment"));
  });

  it("never shows a Signer a clause-type identifier", async () => {
    const html = await renderFixture("balanced-contract.txt");

    for (const entry of CHECKLIST_ENTRIES) {
      expect(html, entry).not.toContain(entry);
    }
  });

  it("says how much of the checklist came back clean, so a short list reads as a short list", async () => {
    const balanced = await renderFixture("balanced-contract.txt");
    const adhesion = await renderFixture("adhesion-contract.txt");

    expect(balanced).toContain(`7 of ${CHECKLIST_ENTRIES.length}`);
    expect(adhesion).toContain(`4 of ${CHECKLIST_ENTRIES.length}`);
  });

  it("leads every cleared row with one blue-pencil check and nothing in the correcting hand", async () => {
    const html = await renderFixture("balanced-contract.txt");
    const rows = html.match(/<li /g) ?? [];
    const checks = html.match(/<svg /g) ?? [];

    expect(rows.length).toBe(7);
    expect(checks.length).toBe(rows.length);
    // `DESIGN.md`'s One Correcting Hand Rule: vermilion is a correction, and nothing on
    // this list is one.
    expect(html).not.toContain("text-mark");
    expect(html).toContain("text-pencil");
  });
});
