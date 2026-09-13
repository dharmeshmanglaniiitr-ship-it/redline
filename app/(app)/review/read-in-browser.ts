"use client";

/**
 * The browser end of bringing a document in, and the only code in the path that knows
 * what a `File` is.
 *
 * Everything past this point takes bytes, which is what lets the whole of extraction be
 * driven from a test with no browser. Nothing here uploads anything: the bytes are read
 * off the Signer's own disk, parsed in a worker in their own tab, and dropped. Only the
 * extracted text survives the call (`CLAUDE.md`).
 */

import { readDocumentFile } from "@/lib/document/extract";
import type { ExtractionResult } from "@/lib/document/extraction";

/**
 * pdf.js parses in a web worker so a long contract does not freeze the tab while it is
 * read. The worker is bundled from the installed package and served from this origin;
 * it fetches nothing.
 */
function createPdfWorker(): Worker {
  return new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url), {
    type: "module",
  });
}

/** Read a file the Signer picked. Never throws, never uploads. */
export async function readFileInBrowser(file: File): Promise<ExtractionResult> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { outcome: "unreadable", name: file.name, reason: "damaged-file", foundText: "" };
  }

  return readDocumentFile(
    { name: file.name, bytes, mimeType: file.type },
    { createPdfWorker }
  );
}
