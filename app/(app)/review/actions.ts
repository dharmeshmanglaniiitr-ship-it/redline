"use server";

/**
 * Putting the text of a document a Signer has just read into their library.
 *
 * The text arrives from the browser, because that is where the file was opened and where
 * it stayed — the file itself never made this trip and never will (`CLAUDE.md`). What
 * arrives is run back through `readExtractedText`, the one function that decides whether
 * something counts as a readable document, rather than being trusted and written straight
 * in. That re-splits the sentences from the same text a flag will later be matched
 * against, and it means a post carrying a page number's worth of words is refused here on
 * the same rule the browser refused it on.
 */

import {
  DOCUMENT_FORMATS,
  readExtractedText,
  type DocumentFormat,
} from "@/lib/document/extraction";
import { saveDocument } from "@/lib/supabase/documents";

import type { KeepState } from "./keep-state";

export async function keepDocument(_previous: KeepState, form: FormData): Promise<KeepState> {
  const name = String(form.get("name") ?? "").trim();
  const format = String(form.get("format") ?? "");
  const text = String(form.get("text") ?? "");

  if (name === "" || !isDocumentFormat(format)) {
    return { status: "refused", message: "Something went astray on the way over. Read the document again." };
  }

  const reread = readExtractedText({
    name,
    format,
    rawText: text,
    whenEmpty: "no-text-layer",
  });

  if (reread.outcome === "unreadable") {
    // Nothing that could not be read is ever stored, because a document saved with no
    // words in it would come back later looking like a contract with nothing wrong in it.
    return {
      status: "refused",
      message: "There is not enough here to keep. Read the document again.",
    };
  }

  const saved = await saveDocument(reread);

  switch (saved.outcome) {
    case "saved":
      return { status: "kept", name: saved.document.name };
    case "not-signed-in":
      return { status: "not-signed-in" };
    case "accounts-not-set-up":
      return { status: "accounts-not-set-up" };
    case "refused":
      console.error("documents insert refused:", saved.detail);
      return {
        status: "refused",
        message: "The library would not take it. Nothing was saved, so try once more.",
      };
  }
}

function isDocumentFormat(value: string): value is DocumentFormat {
  return (DOCUMENT_FORMATS as readonly string[]).includes(value);
}
