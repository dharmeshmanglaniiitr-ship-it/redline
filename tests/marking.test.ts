/**
 * The in-line half of the paired mark, as arithmetic.
 *
 * The screen underlines a flag's sentence where it actually sits in the contract, which
 * means cutting the document at that sentence's boundaries. The rule that matters is
 * that the cut is lossless: the pieces put back together are the block they came from,
 * character for character. A contract rendered with a space moved would be a misquotation
 * on the same screen that promises none, and the promise is the product.
 */

import { describe, expect, it } from "vitest";

import { analyze } from "@/lib/analysis/analyze";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { clauseReferenceIn, markUpDocument } from "@/lib/text/marking";

import { fixtureNames, loadFixture } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";

const CONTRACT = [
  "4. FEES AND PAYMENT",
  "",
  "4.1 The Client shall pay a fixed fee of £18,000.",
  "4.2 No invoice falls due until the Client is satisfied.",
  "4.3 Invoices are paid within sixty (60) days.",
].join("\n");

describe("markUpDocument", () => {
  it("marks the cited sentence and leaves the rest of the clause alone", () => {
    const blocks = markUpDocument(CONTRACT, [
      { id: "payment-1", sourceSentence: "4.2 No invoice falls due until the Client is satisfied." },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].flagIds).toEqual([]);
    expect(blocks[1].flagIds).toEqual(["payment-1"]);

    const marked = blocks[1].spans.filter((span) => span.flagId !== null);
    expect(marked).toHaveLength(1);
    expect(marked[0].text).toBe("4.2 No invoice falls due until the Client is satisfied.");
  });

  it("gives back the document it was handed, character for character", () => {
    const blocks = markUpDocument(CONTRACT, [
      { id: "payment-1", sourceSentence: "4.2 No invoice falls due until the Client is satisfied." },
      { id: "terms-1", sourceSentence: "4.3 Invoices are paid within sixty (60) days." },
    ]);

    const rebuilt = blocks
      .map((block) => block.spans.map((span) => span.text).join(""))
      .join("\n\n");
    expect(rebuilt).toBe(CONTRACT);
  });

  it("marks two sentences in one clause in the order they are read", () => {
    const blocks = markUpDocument(CONTRACT, [
      { id: "terms-1", sourceSentence: "4.3 Invoices are paid within sixty (60) days." },
      { id: "payment-1", sourceSentence: "4.2 No invoice falls due until the Client is satisfied." },
    ]);

    // The flags arrived worst-first; the marks come back in document order, because that
    // is the order the sentences sit on the page.
    expect(blocks[1].flagIds).toEqual(["payment-1", "terms-1"]);
  });

  it("marks a sentence once, even when the contract repeats it", () => {
    const repeated = `${CONTRACT}\n\n9. SCHEDULE\n\n4.3 Invoices are paid within sixty (60) days.`;
    const blocks = markUpDocument(repeated, [
      { id: "terms-1", sourceSentence: "4.3 Invoices are paid within sixty (60) days." },
    ]);

    const marks = blocks.flatMap((block) => block.flagIds);
    expect(marks).toEqual(["terms-1"]);
  });

  it("leaves the text unmarked rather than marking the wrong sentence", () => {
    const blocks = markUpDocument(CONTRACT, [
      { id: "invented-1", sourceSentence: "The Client may withhold payment at will." },
    ]);

    expect(blocks.flatMap((block) => block.flagIds)).toEqual([]);
    expect(blocks.flatMap((block) => block.spans).every((span) => span.flagId === null)).toBe(
      true
    );
  });

  it("marks every flag of every contract in the corpus, losing no text", async () => {
    // The end-to-end version: real flags from `analyze()`, laid back over the real
    // document. Every flag finds its sentence, because the citation was verified against
    // this same text before the flag existed.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      const { flags } = await analyze(
        {
          documentText: fixture.text,
          redLines: [],
          jurisdiction: UNDETERMINED_JURISDICTION,
        },
        createStubModelGateway(fixture)
      );

      const blocks = markUpDocument(fixture.text, flags);
      expect(blocks.flatMap((block) => block.flagIds).sort(), name).toEqual(
        flags.map((flag) => flag.id).sort()
      );

      for (const block of blocks) {
        for (const span of block.spans) {
          expect(fixture.text, `${name}: ${span.text.slice(0, 40)}`).toContain(span.text);
        }
      }
    }
  });
});

describe("clauseReferenceIn", () => {
  it("reads the clause number a contract opens its sentence with", () => {
    expect(clauseReferenceIn("9.1 For twelve (12) months after the end of the Term.")).toBe(
      "9.1"
    );
    expect(clauseReferenceIn("12.1 This Agreement is governed by the law of Scotland.")).toBe(
      "12.1"
    );
    expect(clauseReferenceIn("(4) The Client shall pay.")).toBe("4");
  });

  it("gives back nothing rather than inventing a reference", () => {
    expect(clauseReferenceIn("The Client shall pay the Contractor.")).toBeNull();
    expect(clauseReferenceIn("£18,000 is payable on completion.")).toBeNull();
    expect(clauseReferenceIn("")).toBeNull();
  });

  it("finds a reference for every planted clause in the corpus", () => {
    // Every contract in the corpus numbers its clauses, so the margin mark can always
    // say which clause it is pointing at. A contract that did not would get a mark with
    // no reference rather than a wrong one.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      for (const clause of fixture.sidecar.planted) {
        expect(clauseReferenceIn(clause.sourceSentence), `${name}: ${clause.id}`).not.toBeNull();
      }
    }
  });
});
