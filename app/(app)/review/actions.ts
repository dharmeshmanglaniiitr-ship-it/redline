"use server";

/**
 * The two things the server does with a document a Signer has just read: explain it, and
 * keep it.
 *
 * The text arrives from the browser, because that is where the file was opened and where
 * it stayed — the file itself never made this trip and never will (`CLAUDE.md`). What
 * arrives is run back through `readExtractedText`, the one function that decides whether
 * something counts as a readable document, rather than being trusted and used as it came.
 * That re-splits the sentences from the same text a flag will later be matched against,
 * and it means a post carrying a page number's worth of words is refused here on the same
 * rule the browser refused it on — so nothing unreadable reaches the analysis, on this
 * side of the wire either.
 *
 * The model key is read here and never leaves: `OPENROUTER_API_KEY` carries no
 * `NEXT_PUBLIC_` prefix, these functions run on the server, and what goes back to the
 * browser is the analysis, not the means of producing it.
 */

import { analyze } from "@/lib/analysis/analyze";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import {
  DOCUMENT_FORMATS,
  readExtractedText,
  type DocumentFormat,
} from "@/lib/document/extraction";
import { openRouterAccess } from "@/lib/model/openrouter";
import { saveDocument } from "@/lib/supabase/documents";

import type { AnalysisState, ReadDocument } from "./analysis-state";
import type { KeepState } from "./keep-state";

/**
 * Explain what a document commits the Signer to.
 *
 * The analysis itself is a pure function over text (`lib/analysis/analyze.ts`). All this
 * does is what only a server can: read the environment, build the gateway, and turn
 * whatever went wrong into something a Signer can act on. A deployment with no model
 * access says so plainly rather than looking broken, and a call that failed says the
 * wording is still on the page rather than throwing the Signer back to the start.
 */
export async function explainDocument(document: ReadDocument): Promise<AnalysisState> {
  if (!isDocumentFormat(document.format)) {
    return { status: "nothing-to-read" };
  }

  const reread = readExtractedText({
    name: document.name,
    format: document.format,
    rawText: document.text,
    whenEmpty: "no-text-layer",
  });
  if (reread.outcome === "unreadable") {
    return { status: "nothing-to-read" };
  }

  const access = openRouterAccess();
  if (access.outcome === "not-set-up") {
    console.error(`model access is not set up: no ${access.missing.join(" and no ")}`);
    return { status: "model-not-set-up" };
  }

  try {
    const result = await analyze(
      {
        documentText: reread.text,
        // Red lines and a jurisdiction are inputs the analysis already takes. Nothing
        // supplies them yet — tickets 13 and 14 — and an assumed jurisdiction would be
        // exactly the silent default ADR 0007 exists to prevent.
        redLines: [],
        jurisdiction: UNDETERMINED_JURISDICTION,
      },
      access.gateway
    );
    return { status: "explained", result };
  } catch (cause) {
    // The detail is for the log. What a Signer gets is what to do next.
    console.error("the analysis did not come back:", cause);
    return {
      status: "failed",
      message:
        "The explanation did not come back. Your document is still on this page, so you " +
        "can try again.",
    };
  }
}

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
