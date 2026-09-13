/**
 * Reading the text out of a `.docx`, the format freelance contracts actually arrive in.
 *
 * `mammoth` is given the paragraph text only — no styles, no images, no embedded
 * objects — because the analysis works on sentences and nothing else in the file is
 * quotable. The old binary `.doc` format is not readable here and is turned away by
 * `documentFormatFor` before it gets this far.
 */

import mammoth from "mammoth";

import { readExtractedText, unreadable, type ExtractionResult } from "@/lib/document/extraction";

/** Read a `.docx`. Never throws: a file it cannot open comes back unreadable. */
export async function readDocx(name: string, bytes: Uint8Array): Promise<ExtractionResult> {
  try {
    const { value } = await mammoth.extractRawText(mammothInput(bytes));
    return readExtractedText({
      name,
      format: "docx",
      rawText: value,
      // A .docx that opened cleanly and held no text is a page of scanned images.
      whenEmpty: "no-text-layer",
    });
  } catch {
    return unreadable(name, "damaged-file");
  }
}

/**
 * mammoth ships two builds. The Node one reads `buffer`, the browser one reads
 * `arrayBuffer`, the bundler picks between them, and neither looks at the other's key —
 * so both are supplied and whichever build is running finds the one it wants. Its
 * published type is the union of the two, which is why this is spelled out here once
 * rather than at the call site.
 */
function mammothInput(bytes: Uint8Array): Parameters<typeof mammoth.extractRawText>[0] {
  const input = {
    buffer: bytes,
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  return input as unknown as Parameters<typeof mammoth.extractRawText>[0];
}
