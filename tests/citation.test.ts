/**
 * The citation verifier, which is `docs/adr/0001` made mechanical.
 *
 * The product's whole claim rests on a Signer being able to take a quoted sentence,
 * search their own copy of the contract for it, and find it. So the check is on the
 * characters, and everything asserted here is a way of getting the characters wrong: a
 * paraphrase that says the same thing, a quote whose whitespace was tidied, half a
 * sentence, two sentences joined.
 *
 * What matters as much as the failing is what happens next. A finding whose citation
 * does not verify is **dropped**. Not returned with a note saying the source could not
 * be confirmed, not returned pointing at the nearest sentence instead. A caveat would
 * leave the Signer holding a claim they cannot check, and a claim they cannot check is
 * the exact thing this rule exists to stop, so the tests assert on what comes back
 * rather than on how it was labelled.
 */

import { describe, expect, it } from "vitest";

import {
  citationVerifies,
  createCitationVerifier,
  keepVerifiedCitations,
} from "@/lib/analysis/citation";
import { splitIntoSentences } from "@/lib/text/sentences";

import { loadFixture } from "./support/fixtures";

const CONTRACT = [
  "4. FEES, ACCEPTANCE AND PAYMENT",
  "",
  "4.1 The Client shall pay the Contractor a fixed fee of £18,000 for the Deliverables.",
  "4.2 No invoice falls due for payment until the Client has accepted the relevant Deliverable as satisfactory in the Client's sole and absolute discretion.",
  "4.3 The Client shall pay each approved invoice within sixty (60) days.",
].join("\n");

const QUOTED =
  "4.2 No invoice falls due for payment until the Client has accepted the relevant Deliverable as satisfactory in the Client's sole and absolute discretion.";

describe("the citation verifier", () => {
  it("verifies a sentence copied out of the document character for character", () => {
    expect(citationVerifies(CONTRACT, QUOTED)).toBe(true);
    expect(createCitationVerifier(CONTRACT).verified(QUOTED)).toBe(QUOTED);
  });

  it("drops a paraphrase, however accurate it is", () => {
    // Materially true, and a Signer searching their own contract for it finds nothing.
    // That is the entire case: this is not a lesser citation, it is not a citation.
    const paraphrase =
      "Payment is not due until the Client decides in its sole discretion that the Deliverable is satisfactory.";

    expect(citationVerifies(CONTRACT, paraphrase)).toBe(false);
    expect(keepVerifiedCitations(CONTRACT, [{ sourceSentence: paraphrase }])).toEqual([]);
  });

  it("drops a quote whose whitespace was reformatted", () => {
    const reflowed = QUOTED.replace(
      "until the Client",
      "until\n      the Client"
    );
    const doubleSpaced = QUOTED.replace("falls due", "falls  due");

    expect(citationVerifies(CONTRACT, reflowed)).toBe(false);
    expect(citationVerifies(CONTRACT, doubleSpaced)).toBe(false);
    expect(
      keepVerifiedCitations(CONTRACT, [
        { sourceSentence: reflowed },
        { sourceSentence: doubleSpaced },
      ])
    ).toEqual([]);
  });

  it("allows whitespace around the whole quote, because a trailing newline is not a misquote", () => {
    const padded = `\n  ${QUOTED}  \n`;
    expect(citationVerifies(CONTRACT, padded)).toBe(true);
    // What comes back is the trimmed text, so the flag carries the document's own string
    // rather than the model's spacing around it.
    expect(keepVerifiedCitations(CONTRACT, [{ sourceSentence: padded }])).toEqual([
      { sourceSentence: QUOTED },
    ]);
  });

  it("drops a fragment that is only part of a sentence", () => {
    const fragment = "the Client's sole and absolute discretion.";
    expect(CONTRACT).toContain(fragment);
    expect(citationVerifies(CONTRACT, fragment)).toBe(false);
  });

  it("drops two sentences quoted as though they were one", () => {
    const joined =
      "4.1 The Client shall pay the Contractor a fixed fee of £18,000 for the Deliverables.\n4.2 No invoice falls due for payment until the Client has accepted the relevant Deliverable as satisfactory in the Client's sole and absolute discretion.";
    expect(CONTRACT).toContain(joined);
    expect(citationVerifies(CONTRACT, joined)).toBe(false);
  });

  it("drops an empty quote rather than treating it as a citation of everything", () => {
    expect(citationVerifies(CONTRACT, "")).toBe(false);
    expect(citationVerifies(CONTRACT, "   \n ")).toBe(false);
  });

  it("drops a sentence that is really in a different contract", () => {
    const other = loadFixture("balanced-contract.txt");
    expect(citationVerifies(CONTRACT, other.sentences[2])).toBe(false);
  });

  it("keeps the good citations and drops the bad ones from the same list", () => {
    // The dropping is per finding. One unverifiable quote among four is not a reason to
    // tell a Signer nothing, and three good quotes are not a reason to wave the fourth
    // through.
    const kept = keepVerifiedCitations(CONTRACT, [
      { sourceSentence: QUOTED, id: "payment" },
      { sourceSentence: "The Client may withhold payment at will.", id: "invented" },
      {
        sourceSentence: "4.3 The Client shall pay each approved invoice within sixty (60) days.",
        id: "terms",
      },
    ]);

    expect(kept.map((finding) => finding.id)).toEqual(["payment", "terms"]);
    // Nothing came back carrying a note about a source that could not be found.
    for (const finding of kept) {
      expect(CONTRACT).toContain(finding.sourceSentence);
    }
  });

  it("verifies every sentence of every contract in the corpus against its own document", () => {
    // The other direction of the same rule: the splitter and the verifier have to agree
    // about what a sentence is, or a correctly quoted sentence would fail the check and
    // a real finding would be dropped.
    for (const name of ["adhesion-contract.txt", "pair-hedge-silent.txt"]) {
      const fixture = loadFixture(name);
      const verifier = createCitationVerifier(fixture.text);
      for (const sentence of splitIntoSentences(fixture.text)) {
        expect(verifier.verifies(sentence), `${name}: ${sentence}`).toBe(true);
      }
    }
  });
});
