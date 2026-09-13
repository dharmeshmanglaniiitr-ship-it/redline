import { describe, expect, it } from "vitest";

import { splitIntoSentences } from "@/lib/text/sentences";

describe("splitIntoSentences", () => {
  it("splits a clause into the sentences a flag can cite", () => {
    const clause =
      "The Contractor shall not perform services for any competitor of the Client " +
      "for 24 months after termination. This restriction applies worldwide. " +
      "No additional compensation is payable for the restricted period.";

    expect(splitIntoSentences(clause)).toEqual([
      "The Contractor shall not perform services for any competitor of the Client " +
        "for 24 months after termination.",
      "This restriction applies worldwide.",
      "No additional compensation is payable for the restricted period.",
    ]);
  });

  it("does not break on the full stops in clause numbers, initials or cross-references", () => {
    const clause =
      "4. PAYMENT\n" +
      "Invoices are approved by J. Smith under Sec. 7 of this Agreement. " +
      "Approval is at the Client's sole discretion under Section 4.2.";

    expect(splitIntoSentences(clause)).toEqual([
      "4. PAYMENT",
      "Invoices are approved by J. Smith under Sec. 7 of this Agreement.",
      "Approval is at the Client's sole discretion under Section 4.2.",
    ]);
  });

  it("returns each sentence verbatim, so a citation can be matched against the document", () => {
    const document =
      "  Ownership of all work product vests in the Client.\n\n" +
      "  The Contractor waives all moral rights.  ";

    for (const sentence of splitIntoSentences(document)) {
      expect(document).toContain(sentence);
    }
  });

  it("finds nothing in text that has no sentences", () => {
    expect(splitIntoSentences("   \n\n  ")).toEqual([]);
  });
});
