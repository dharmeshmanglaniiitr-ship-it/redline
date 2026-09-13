/**
 * Bringing a document in.
 *
 * Two ways in, treated as equals: a file off the Signer's machine, or text pasted
 * straight into the page. Pasting is the path that needs no account and no parser, and
 * it is the fallback Redline offers whenever a file turns out to be unreadable, so it
 * is not a lesser route — both land on the same `ExtractionResult`.
 *
 * Everything here takes bytes rather than a DOM `File`, which is what lets the whole
 * path be driven from a test with no browser. The `File` end of it lives at the edge,
 * in the screen that reads the bytes off the Signer's machine.
 */

import { readDocx } from "@/lib/document/docx";
import {
  documentFormatFor,
  readExtractedText,
  unreadable,
  type ExtractionResult,
} from "@/lib/document/extraction";
import { readPdf, type PdfReadOptions } from "@/lib/document/pdf";

export interface DocumentBytes {
  /** What to call the document on screen — the file's own name. */
  readonly name: string;
  readonly bytes: Uint8Array;
  /** The type the browser reported, used only when the name has no useful extension. */
  readonly mimeType?: string;
}

/**
 * Read a file the Signer chose. Never throws, never uploads: the bytes are parsed where
 * they are and only the extracted text goes any further (`CLAUDE.md`).
 */
export async function readDocumentFile(
  file: DocumentBytes,
  options: PdfReadOptions = {}
): Promise<ExtractionResult> {
  const format = documentFormatFor(file.name, file.mimeType ?? "");

  switch (format) {
    case "pdf":
      return readPdf(file.name, file.bytes, options);
    case "docx":
      return readDocx(file.name, file.bytes);
    case "text":
      return readExtractedText({
        name: file.name,
        format: "text",
        rawText: new TextDecoder("utf-8").decode(file.bytes),
        whenEmpty: "too-little-text",
      });
    case null:
      return unreadable(file.name, "unsupported-format");
  }
}

/** Read text the Signer pasted in. The same result type as a file, on purpose. */
export function readPastedText(name: string, pastedText: string): ExtractionResult {
  return readExtractedText({
    name,
    format: "text",
    rawText: pastedText,
    whenEmpty: "too-little-text",
  });
}
