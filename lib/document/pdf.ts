/**
 * Reading the text layer out of a PDF.
 *
 * This uses Mozilla's pdf.js, which extracts the text layer a PDF already carries and
 * does no OCR. That is the behaviour Redline wants rather than a limitation to work
 * around: a PDF with no text layer comes back with nothing, and nothing is exactly the
 * signal the unreadable state is built on. A citation is worth nothing if the words
 * behind it were guessed at from pixels (`CLAUDE.md`).
 *
 * The same code runs in a browser and in Node. In Node, pdf.js parses in-process; in a
 * browser the caller passes `createPdfWorker` so parsing happens off the main thread.
 * Nothing here touches `File`, the DOM or the network — the bytes arrive already read.
 */

import { getDocument, PDFWorker } from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  DocumentInitParameters,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

import { readExtractedText, unreadable, type ExtractionResult } from "@/lib/document/extraction";

export interface PdfReadOptions {
  /**
   * Makes the web worker a PDF is parsed in, so a long contract does not freeze the
   * page. Omit it in Node, where pdf.js parses in-process and needs no worker.
   */
  readonly createPdfWorker?: () => Worker;
}

/** Read a PDF's text layer. Never throws: a PDF it cannot open comes back unreadable. */
export async function readPdf(
  name: string,
  bytes: Uint8Array,
  options: PdfReadOptions = {}
): Promise<ExtractionResult> {
  const port = options.createPdfWorker?.();

  const parameters: DocumentInitParameters = {
    // pdf.js transfers the buffer it is given, so it gets a copy and the caller keeps
    // its own bytes intact.
    data: new Uint8Array(bytes),
    // Nothing is ever drawn from this document, only read, so its fonts are never built.
    disableFontFace: true,
    // Errors only. A missing font warning is noise here; the outcome is the report.
    verbosity: 0,
  };
  if (port !== undefined) {
    parameters.worker = PDFWorker.create({ port, verbosity: 0 });
  }

  const task = getDocument(parameters);

  try {
    const pdf = await task.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        pages.push(joinTextItems(content.items));
      } finally {
        page.cleanup();
      }
    }

    return readExtractedText({
      name,
      format: "pdf",
      rawText: unwrapDrawnLines(pages.join("\n\n")),
      // A PDF that opened cleanly and held no text is the scanned-contract case.
      whenEmpty: "no-text-layer",
    });
  } catch (error) {
    return unreadable(name, isPasswordException(error) ? "password-protected" : "damaged-file");
  } finally {
    await task.destroy();
    port?.terminate();
  }
}

/**
 * pdf.js reports a page as a run of positioned strings. `hasEOL` marks the end of a
 * drawn line, which is the only line structure a PDF's text layer actually carries.
 */
function joinTextItems(items: readonly (TextItem | TextMarkedContent)[]): string {
  let text = "";
  for (const item of items) {
    if (!("str" in item)) continue;
    text += item.str;
    if (item.hasEOL) text += "\n";
  }
  return text;
}

/** Ends a sentence. The closer allows for a stop that sits inside a quote or bracket. */
const SENTENCE_END = /[.!?:;]["'”’)\]]?$/;
/** "4.2 ", "(3) ", "12. " — the opening of a numbered clause. */
const CLAUSE_OPENING = /^\(?\d+(?:\.\d+)*[.)]?\s/;
/** A run with no lower-case letters in it: a heading set in capitals. */
const CAPITALS = /^[^a-z]{6,}$/;
/**
 * Longer than any heading and shorter than a full line of a contract set at a normal
 * measure. A line below this that carries no closing punctuation is a heading, not the
 * first half of a sentence.
 */
const SHORTEST_WRAPPED_LINE = 50;

/**
 * Put back the sentences a PDF broke into drawn lines.
 *
 * The line breaks in a PDF's text layer are typesetting, not the author's: a sentence
 * running across three lines was written as one. `splitIntoSentences` ends a sentence
 * at a line break, so leaving them in would mean every flag from a PDF quoted half a
 * line — and a half-line citation is exactly the unverifiable claim ADR 0001 forbids.
 *
 * The joins are deliberately cautious. A line that closes with punctuation, a heading,
 * and the start of a numbered clause are all left where they are, so the worst this can
 * do is leave a break in rather than invent one.
 */
export function unwrapDrawnLines(text: string): string {
  const lines = text.split("\n");
  const joined: string[] = [];

  for (const line of lines) {
    const previous = joined[joined.length - 1];
    const current = line.trim();

    const continues =
      previous !== undefined &&
      previous !== "" &&
      current !== "" &&
      previous.length > SHORTEST_WRAPPED_LINE &&
      !SENTENCE_END.test(previous) &&
      !CLAUSE_OPENING.test(current) &&
      !CAPITALS.test(current);

    if (continues) {
      joined[joined.length - 1] = `${previous} ${current}`;
    } else {
      joined.push(current);
    }
  }

  return joined.join("\n");
}

function isPasswordException(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PasswordException"
  );
}
