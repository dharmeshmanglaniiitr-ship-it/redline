/**
 * Bringing a document in.
 *
 * The test that matters most here is the first one: `tests/fixtures/unreadable-scan.pdf`
 * is a valid PDF with an image where its text should be, exactly what a Signer gets
 * when a client scans a signed contract and emails the scan. It has to come back as a
 * document that could not be read, never as a document that was read and turned out to
 * be empty. Everything else in this file exists so that outcome means something: a
 * parser that always gave up would satisfy the scan case and fail the rest.
 *
 * All of it runs in Node. No browser, no network, no `File`.
 */

import { describe, expect, it } from "vitest";

import { readDocumentFile, readPastedText } from "@/lib/document/extract";
import {
  countReadableCharacters,
  documentFormatFor,
  MINIMUM_READABLE_CHARACTERS,
  normalizeDocumentText,
  type ExtractionResult,
} from "@/lib/document/extraction";
import { splitIntoSentences } from "@/lib/text/sentences";
import { docxWithParagraphs, pdfWithTextLayer } from "./support/documents";
import { loadBinaryFixture, loadFixture } from "./support/fixtures";

const CONTRACT_LINES = [
  "SERVICES AGREEMENT",
  "This Agreement is made between Harbourline Retail Group Limited (the Client)",
  "and Priya Raman, trading as Raman Studio (the Contractor).",
  "4.2 Acceptance",
  "The Deliverables shall be deemed accepted only upon the Client's written",
  "confirmation that they are satisfactory to the Client in its sole discretion.",
  "7.1 Assignment of Work Product",
  "The Contractor assigns to the Client all right, title and interest in the",
  "Deliverables produced under this Agreement.",
];

describe("a scanned contract", () => {
  it("comes back as a document that could not be read, not as an empty one", async () => {
    const result = await readDocumentFile({
      name: "unreadable-scan.pdf",
      bytes: loadBinaryFixture("unreadable-scan.pdf"),
      mimeType: "application/pdf",
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;

    expect(result.reason).toBe("no-text-layer");
    expect(result.foundText).toBe("");
    // Nothing downstream can mistake this for a document: there is no text on it to
    // mistake. An analysis handed this result could not run at all.
    expect(result).not.toHaveProperty("text");
    expect(result).not.toHaveProperty("sentences");
  });

  it("is told apart from a document that was read and had little to say", async () => {
    const scan = await readDocumentFile({
      name: "unreadable-scan.pdf",
      bytes: loadBinaryFixture("unreadable-scan.pdf"),
    });
    const quiet = readPastedText("Pasted text", loadFixture("balanced-contract.txt").text);

    expect(scan.outcome).toBe("unreadable");
    expect(quiet.outcome).toBe("extracted");
  });
});

describe("a PDF with a text layer", () => {
  it("comes back with the sentences the PDF actually draws", async () => {
    const result = await readDocumentFile({
      name: "acceptance-terms.pdf",
      bytes: pdfWithTextLayer(CONTRACT_LINES),
      mimeType: "application/pdf",
    });

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;

    expect(result.format).toBe("pdf");
    expect(result.text).toContain(
      "The Deliverables shall be deemed accepted only upon the Client's written " +
        "confirmation that they are satisfactory to the Client in its sole discretion."
    );
    expect(result.sentences.length).toBeGreaterThan(1);
  });

  it("puts back the sentences the PDF broke into drawn lines", async () => {
    const result = await readDocumentFile({
      name: "acceptance-terms.pdf",
      bytes: pdfWithTextLayer(CONTRACT_LINES),
    });

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;

    // The headings keep their own lines; the wrapped clause becomes one sentence a flag
    // can quote whole.
    expect(result.sentences).toContain("4.2 Acceptance");
    expect(result.sentences).toContain(
      "The Deliverables shall be deemed accepted only upon the Client's written " +
        "confirmation that they are satisfactory to the Client in its sole discretion."
    );
  });

  it("is turned away when there is a header's worth of text and nothing else", async () => {
    const result = await readDocumentFile({
      name: "stamped-scan.pdf",
      bytes: pdfWithTextLayer(["Page 1 of 8", "Scanned by Harbourline Retail Group"]),
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;

    expect(result.reason).toBe("too-little-text");
    // What did come out is kept, so the Signer can see why it was turned away.
    expect(result.foundText).toContain("Page 1 of 8");
  });

  it("comes back as damaged when the bytes are not a PDF at all", async () => {
    const result = await readDocumentFile({
      name: "contract.pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 and then nothing that parses"),
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toBe("damaged-file");
  });
});

describe("a .docx", () => {
  it("comes back with its paragraphs", async () => {
    const result = await readDocumentFile({
      name: "engagement.docx",
      bytes: docxWithParagraphs(CONTRACT_LINES),
    });

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;

    expect(result.format).toBe("docx");
    expect(result.text).toContain("7.1 Assignment of Work Product");
  });

  it("comes back unreadable when it holds pictures of a contract and no text", async () => {
    const result = await readDocumentFile({
      name: "scan.docx",
      bytes: docxWithParagraphs([]),
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toBe("no-text-layer");
  });

  it("comes back as damaged when the file is not a .docx", async () => {
    const result = await readDocumentFile({
      name: "engagement.docx",
      bytes: new TextEncoder().encode("this was renamed, not converted"),
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toBe("damaged-file");
  });
});

describe("a file Redline has no parser for", () => {
  it("says so rather than reporting an empty document", async () => {
    const result = await readDocumentFile({
      name: "contract-page-1.jpg",
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      mimeType: "image/jpeg",
    });

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toBe("unsupported-format");
  });

  it("turns away the old binary .doc, which has no parser here", () => {
    expect(documentFormatFor("engagement.doc")).toBeNull();
    expect(documentFormatFor("engagement.docx")).toBe("docx");
    expect(documentFormatFor("engagement.PDF")).toBe("pdf");
    expect(documentFormatFor("engagement.txt")).toBe("text");
    expect(documentFormatFor("engagement", "application/pdf")).toBe("pdf");
  });
});

describe("pasted text", () => {
  it("reaches the same result a file does", () => {
    const { text } = loadFixture("adhesion-contract.txt");
    const result = readPastedText("Pasted text", text);

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;
    expect(result.format).toBe("text");
    expect(result.sentences.length).toBeGreaterThan(20);
  });

  it("is turned away when there is nothing much to read", () => {
    const result = readPastedText("Pasted text", "  \n\n  ");

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toBe("too-little-text");
  });

  it("draws the line where a contract stops being one", () => {
    const short = "Payment is due thirty days after acceptance. ".repeat(2);
    const long = "Payment is due thirty days after acceptance. ".repeat(20);

    expect(countReadableCharacters(short)).toBeLessThan(MINIMUM_READABLE_CHARACTERS);
    expect(readPastedText("Pasted text", short).outcome).toBe("unreadable");
    expect(readPastedText("Pasted text", long).outcome).toBe("extracted");
  });
});

describe("the text that comes out", () => {
  it("keeps every sentence quotable, whichever way the document came in", async () => {
    const { text, sidecar } = loadFixture("adhesion-contract.txt");
    const sources: ExtractionResult[] = [
      readPastedText("Pasted text", text),
      await readDocumentFile({
        name: "adhesion-contract.txt",
        bytes: new TextEncoder().encode(text),
      }),
    ];

    for (const result of sources) {
      expect(result.outcome).toBe("extracted");
      if (result.outcome !== "extracted") continue;

      // The citation rule (`docs/adr/0001`): a flag quotes a sentence and that sentence
      // is matched against this text by exact substring. Normalizing on the way in must
      // not cost the corpus a single planted citation.
      for (const clause of sidecar.planted) {
        expect(result.text).toContain(clause.sourceSentence);
      }
      for (const sentence of result.sentences) {
        expect(result.text).toContain(sentence);
      }
      expect(result.sentences).toEqual(splitIntoSentences(result.text));
    }
  });

  it("settles line endings and stray spacing before anything quotes it", () => {
    const messy = "Clause  4.2\r\n\r\n\r\n\r\nPayment is due​ in thirty days.  \r\n";

    expect(normalizeDocumentText(messy)).toBe(
      "Clause 4.2\n\nPayment is due in thirty days."
    );
  });
});
