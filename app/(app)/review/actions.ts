"use server";

/**
 * The three things the server does with a document a Signer has just read: explain it,
 * answer a question about it, and keep it.
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
import { answerQuestion } from "@/lib/analysis/answer";
import { detectJurisdiction, determineJurisdiction } from "@/lib/analysis/jurisdiction";
import type { JurisdictionDetection } from "@/lib/analysis/result";
import {
  DOCUMENT_FORMATS,
  readExtractedText,
  type DocumentFormat,
} from "@/lib/document/extraction";
import { openRouterAccess } from "@/lib/model/openrouter";
import { saveDocument, type JurisdictionRecord } from "@/lib/supabase/documents";

import type { AnalysisState, ReadDocument } from "./analysis-state";
import type { KeepState } from "./keep-state";
import type { QuestionState } from "./question-state";

/**
 * Explain what a document commits the Signer to, under the law that governs it.
 *
 * The analysis itself is a pure function over text (`lib/analysis/analyze.ts`). All this
 * does is what only a server can: read the environment, build the gateway, and turn
 * whatever went wrong into something a Signer can act on. A deployment with no model
 * access says so plainly rather than looking broken, and a call that failed says the
 * wording is still on the page rather than throwing the Signer back to the start.
 *
 * The governing law is read before the analysis rather than alongside it, because the
 * analysis is told which law it is working under and cannot be told afterwards. That is
 * one extra call and it buys the thing `docs/adr/0007` is about: the legal claims on the
 * findings name a jurisdiction or withhold themselves, instead of quietly meaning the
 * United States.
 *
 * `signerJurisdiction` is how a correction gets back here. The Signer outranks the
 * document, so passing a name re-runs the whole analysis under it — the flags are read
 * again, and the wording that turns on the law is written again. The detection still
 * runs when they have corrected it, because the clause they overrode is worth seeing.
 *
 * A governing-law reading that does not come back is not a reason to refuse the
 * analysis. It leaves the jurisdiction undetermined, which is a state this product knows
 * how to be in, and the Signer can still set it by hand.
 */
export async function explainDocument(
  document: ReadDocument,
  signerJurisdiction: string | null = null
): Promise<AnalysisState> {
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

  let detected: JurisdictionDetection | null = null;
  try {
    detected = await detectJurisdiction(reread.text, access.gateway);
  } catch (cause) {
    console.error("the governing-law reading did not come back:", cause);
  }

  try {
    const result = await analyze(
      {
        documentText: reread.text,
        // Red lines are an input the analysis already takes; ticket 13 supplies them.
        redLines: [],
        jurisdiction: determineJurisdiction(detected, signerJurisdiction),
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

/**
 * Answer one question about a document, from that document.
 *
 * The same shape as `explainDocument`, and for the same reasons. The answer is a pure
 * function over the text and the question (`lib/analysis/answer.ts`); what only a server
 * can do is read the environment, build the gateway and turn a failure into something a
 * Signer can act on.
 *
 * The text is re-read through `readExtractedText` rather than trusted as it arrived, so a
 * post carrying a page number's worth of words is refused here on the same rule the
 * browser refused it on — and, more to the point, so the text a quoted sentence is matched
 * against is the same text the analysis was matched against. A citation verified against a
 * differently-normalized copy of the document is not verified at all.
 *
 * A refusal is not a failure and does not come back as one. "The contract does not say" is
 * the seam's answer, and it arrives under `answered` like any other.
 */
export async function answerAboutDocument(
  document: ReadDocument,
  question: string
): Promise<QuestionState> {
  const asked = question.trim();
  if (asked === "") {
    return { status: "no-question" };
  }

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
    const answer = await answerQuestion(
      { documentText: reread.text, question: asked },
      access.gateway
    );
    return { status: "answered", answer };
  } catch (cause) {
    console.error("the answer did not come back:", cause);
    return {
      status: "failed",
      message:
        "Nothing came back for that one. Your question is still here, so you can ask it " +
        "again.",
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

  const saved = await saveDocument(reread, jurisdictionFrom(form));

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

/**
 * What the analysis assumed about governing law, carried into the library with the text.
 *
 * `docs/adr/0007` asks for this: a Signer opening a document six months from now has to
 * be able to tell what they were told, and a finding that said "a question for the law of
 * Ireland" means nothing later if the row does not remember Ireland. The detection and
 * the Signer's own choice are stored separately, because they are two different claims —
 * the database enforces that a detection without its sentence cannot be written at all.
 */
function jurisdictionFrom(form: FormData): JurisdictionRecord {
  const name = String(form.get("detectedJurisdiction") ?? "").trim();
  const sentence = String(form.get("detectedJurisdictionSentence") ?? "").trim();
  const chosen = String(form.get("chosenJurisdiction") ?? "").trim();

  return {
    detected: name !== "" && sentence !== "" ? { jurisdiction: name, sourceSentence: sentence } : null,
    chosenBySigner: chosen === "" ? null : chosen,
  };
}

function isDocumentFormat(value: string): value is DocumentFormat {
  return (DOCUMENT_FORMATS as readonly string[]).includes(value);
}
