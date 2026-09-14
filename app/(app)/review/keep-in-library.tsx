"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AnalysisResult } from "@/lib/analysis/result";
import type { ExtractedDocument } from "@/lib/supabase/documents";

import { LABEL, ProofMark, STAMP } from "../_components/galley";
import { useSignerState } from "../_components/signer-context";
import { keepDocument } from "./actions";
import { UNTOUCHED } from "./keep-state";

/**
 * The offer to hold on to a document that has just been read.
 *
 * It takes `ExtractedDocument`, which is the arm of `ExtractionResult` that carries text.
 * A document that could not be read has no text field to hand over, so this cannot be
 * rendered for one — which is the same rule the database enforces and the same rule
 * `CLAUDE.md` states, made three times over rather than remembered once.
 *
 * Signed out, it says what an account would add and gets out of the way. Nothing about
 * the reading is behind the account, and the Signer is not asked to sign in to finish
 * what they were doing.
 *
 * What goes over is the wording and the reading that was made of it, because a saved
 * document shows what Redline said rather than being read again on the way back
 * (`docs/adr/0010`). Both travel as arguments to the action rather than as hidden fields,
 * so the reading cannot arrive in pieces — and the server checks it against the wording
 * anyway before any of it is written down.
 */
export function KeepInLibrary({
  document,
  analysis,
}: {
  document: ExtractedDocument;
  /**
   * The reading on the screen, kept with the text so a Signer coming back in six months
   * sees what they were told (`docs/adr/0010`) and under which law (`docs/adr/0007`).
   * Null while there is no reading — the model is not set up here, or it did not come
   * back — and the wording is kept on its own, which the library says out loud.
   */
  analysis: AnalysisResult | null;
}) {
  const signer = useSignerState();
  const [state, keep, working] = useActionState(
    keepDocument.bind(
      null,
      { name: document.name, format: document.format, text: document.text },
      analysis
    ),
    UNTOUCHED
  );

  const aside =
    "mt-3 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft";

  if (signer.status === "accounts-not-set-up") {
    return (
      <section aria-labelledby="keep-it" className="mt-14 border-t border-rule pt-6">
        <h2 id="keep-it" className={LABEL}>
          Keeping it
        </h2>
        <p className={aside}>
          There is no library on this deployment yet. The database it would live in has
          not been connected. The wording above is on this page and nowhere else, so copy
          what you want before you close the tab.
        </p>
      </section>
    );
  }

  if (signer.status === "signed-out") {
    return (
      <section aria-labelledby="keep-it" className="mt-14 border-t border-rule pt-6">
        <h2 id="keep-it" className={LABEL}>
          Keeping it
        </h2>
        <p className={aside}>
          This document is on the page and nowhere else. An account keeps it, so you can
          come back in six months and see what you agreed to.{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
          >
            Sign in or set one up
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="keep-it" className="mt-14 border-t border-rule pt-6">
      <h2 id="keep-it" className={LABEL}>
        Keeping it
      </h2>

      {state.status === "kept" ? (
        <p className="mt-4 flex items-start gap-2 text-[0.98rem] leading-[1.5] text-pencil">
          <ProofMark kind="caret" className="mt-0.5 h-5 w-5" />
          <span>
            {state.name} is in your library now, under {signer.signer.email}. Only this
            account can open it
            {analysis === null
              ? ", and it holds the wording on its own, because there was no reading to keep with it"
              : ", and it opens on the marks you are reading here"}
            .{" "}
            <Link
              href="/library"
              className="font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
            >
              Go to your library
            </Link>
            .
          </span>
        </p>
      ) : (
        <form action={keep}>
          <p className={aside}>
            Kept against {signer.signer.email}.{" "}
            {analysis === null
              ? "The wording goes to the library on its own. There is no reading to keep " +
                "with it, so this one comes back as the text you read here."
              : "The wording goes to the library, and so do the marks on it, so opening " +
                "it again later shows what Redline said, without reading it a second time."}{" "}
            The file does not go, because it never left your machine.
          </p>
          <button type="submit" className={`${STAMP} mt-5`} disabled={working}>
            {working ? "Keeping" : "Keep this document"}
          </button>
        </form>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {state.status === "kept" ? `${state.name} kept.` : ""}
      </p>

      {(state.status === "refused" ||
        state.status === "not-signed-in" ||
        state.status === "accounts-not-set-up") && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-[0.98rem] leading-[1.5] text-mark-deep">
          <ProofMark kind="query" className="mt-0.5 h-5 w-5" />
          <span>
            {state.status === "refused"
              ? state.message
              : state.status === "not-signed-in"
                ? "Your session ran out while this page was open. Sign in again and the document is still here."
                : "Accounts are not switched on here, so there is nowhere to keep this."}
          </span>
        </p>
      )}
    </section>
  );
}
