/**
 * The marked proof, rendered.
 *
 * There is no browser in this suite and no testing-library in this repo, so what runs
 * here is React's own static renderer over the real component with real flags from
 * `analyze()`. That covers the things about this screen that are claims rather than
 * taste, and it covers them on the markup a Signer would actually be served:
 *
 * - every marked sentence is the document's own text, character for character;
 * - the ranked index lists the findings worst first;
 * - severity ships on all three channels `DESIGN.md` requires, every time;
 * - both halves of every pair are present, tied together by `aria-controls`.
 *
 * What it cannot cover is the part that needs layout: the leader rule measures real
 * rectangles in an effect, so it does not run here, and the 1024px rule it obeys has not
 * been checked against a real viewport.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkedGalley } from "@/app/(app)/review/marked-galley";
import { analyze } from "@/lib/analysis/analyze";
import type { RiskFlag } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { severityWord } from "@/lib/analysis/wording";

import { loadFixture, type Fixture } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";

async function renderFixture(
  name: string
): Promise<{ fixture: Fixture; flags: readonly RiskFlag[]; html: string }> {
  const fixture = loadFixture(name);
  const { flags } = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction: UNDETERMINED_JURISDICTION },
    createStubModelGateway(fixture)
  );
  const html = renderToStaticMarkup(
    createElement(MarkedGalley, { documentText: fixture.text, flags })
  );
  return { fixture, flags, html };
}

/** The rendered text with tags and entities removed, for comparing against the document. */
function readable(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

describe("the marked proof", () => {
  it("sets every flag's sentence as the document wrote it", async () => {
    // The screen is quoting the contract, so a sentence rendered with a space moved
    // would be a misquotation on the same page that promises none.
    const { fixture, flags, html } = await renderFixture("adhesion-contract.txt");
    const text = readable(html);

    expect(flags.length).toBeGreaterThan(0);
    for (const flag of flags) {
      expect(text, flag.id).toContain(flag.sourceSentence);
      expect(fixture.text).toContain(flag.sourceSentence);
    }
  });

  it("renders the whole contract, not only the marked parts of it", async () => {
    const { fixture, html } = await renderFixture("adhesion-contract.txt");
    const text = readable(html);

    for (const sentence of fixture.sentences) {
      expect(text, sentence.slice(0, 48)).toContain(sentence);
    }
  });

  it("lists the findings worst first in the ranked index", async () => {
    const { flags, html } = await renderFixture("adhesion-contract.txt");
    // The index is rendered before the galley, so a title's first appearance is its row
    // in the index and the order of those is the order the Signer reads.
    const text = readable(html);
    const positions = flags.map((flag) => text.indexOf(flag.title));

    expect(positions.every((at) => at >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(flags.map((flag) => flag.severity)).toEqual(
      [...flags].map((flag) => flag.severity).sort((a, b) => b - a)
    );
  });

  it("carries severity on all three channels, for every finding", async () => {
    // `DESIGN.md`'s Never-By-Colour Rule: filled steps out of four, the severity word,
    // and a visually hidden "severity, N of 4". This is a WCAG 2.2 AA commitment, so the
    // assertion is that all three are present for each finding rather than somewhere on
    // the page. Each finding carries the meter twice, in the index and in the margin.
    const { flags, html } = await renderFixture("adhesion-contract.txt");

    for (const flag of flags) {
      const spoken = `severity, ${flag.severity} of 4`;
      expect(html, flag.id).toContain(spoken);
      expect(occurrences(html, spoken), flag.id).toBeGreaterThanOrEqual(2);
      expect(occurrences(html, `>${severityWord(flag.severity)}`), flag.id).toBeGreaterThanOrEqual(2);
    }
    // Four cells per meter, filled up to the finding's step and outlined after it.
    expect(occurrences(html, "bg-mark")).toBeGreaterThanOrEqual(
      flags.reduce((total, flag) => total + flag.severity * 2, 0)
    );
    expect(html).toContain("bg-transparent");
  });

  it("ships both halves of every mark, tied to each other", async () => {
    // The Paired Mark Rule. The margin mark points at the sentence's id, and the
    // sentence carries that id, so the tie is in the markup rather than only in the
    // drawn leader — which is the half that does not exist below 1024px.
    const { flags, html } = await renderFixture("adhesion-contract.txt");

    for (const flag of flags) {
      expect(html, flag.id).toContain(`aria-controls="sentence-${flag.id}"`);
      expect(html, flag.id).toContain(`id="sentence-${flag.id}"`);
      expect(html, flag.id).toContain("this came from");
    }
  });

  it("says what the selected finding would cost, and hedges it where the contract was silent", async () => {
    const silent = await renderFixture("pair-hedge-silent.txt");
    const hedged = silent.flags[0];
    const text = readable(silent.html);

    expect(hedged.hedged).toBe(true);
    expect(text).toContain(hedged.cost);
    expect(text).toContain(hedged.hedgeNote ?? "");

    // The plainly-stated half of the pair carries no hedge to show.
    const stated = await renderFixture("pair-hedge-stated.txt");
    expect(stated.flags[0].hedgeNote).toBeNull();
    expect(readable(stated.html)).toContain(stated.flags[0].cost);
  });

  it("names the clause each mark points at, in the document's own face", async () => {
    const { html } = await renderFixture("adhesion-contract.txt");
    // `DESIGN.md`, The Two Voices Rule: a clause reference belongs to the contract, so
    // it is set in Tinos rather than in Redline's own face.
    expect(html).toContain("Clause 4.2");
    expect(html).toMatch(/font-document[^"]*"[^>]*>Clause /);
  });

  it("shows the wording to send back beside the finding it answers", async () => {
    // The counter-offer belongs with its own flag rather than in a list of its own, and
    // it opens under the cost: what the clause would do, then what to say about it. Only
    // the selected finding's margin card is open, so only its redraft is on the screen.
    const { flags, html } = await renderFixture("adhesion-contract.txt");
    const selected = flags[0];
    const offer = selected.counterOffer;
    if (offer === null) throw new Error("the worst finding came back with no counter-offer");

    const text = readable(html);
    expect(text).toContain("What to send back");
    expect(text.indexOf(selected.cost)).toBeLessThan(text.indexOf(offer.replacement));
    expect(text).toContain(offer.replacement);
    // The whole message, so what is on the screen is what gets pasted into a reply.
    expect(text).toContain(offer.text);
  });

  it("sets the clause text inside a counter-offer in the document's own face", async () => {
    // `DESIGN.md`, The Two Voices Rule, on the one block that carries both voices at
    // once: the clause as it stands and the clause as asked for are the document's
    // words, the note around them is the Signer's.
    const { flags, html } = await renderFixture("retainer-exposed.txt");
    const offer = flags[0].counterOffer;
    if (offer === null) throw new Error("the worst finding came back with no counter-offer");

    const escaped = offer.replacement.replace(/'/g, "&#x27;");
    expect(html).toContain(`class="font-document text-ink">${escaped}</span>`);
  });

  it("marks nothing on a contract that produced no findings", async () => {
    const { flags, html } = await renderFixture("balanced-contract.txt");
    expect(flags).toEqual([]);
    expect(html).not.toContain("aria-controls=\"sentence-");
  });
});

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}
