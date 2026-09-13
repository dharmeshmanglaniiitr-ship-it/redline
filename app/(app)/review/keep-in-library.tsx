"use client";

import Link from "next/link";
import { useActionState } from "react";

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
 */
export function KeepInLibrary({ document }: { document: ExtractedDocument }) {
  const signer = useSignerState();
  const [state, keep, working] = useActionState(keepDocument, UNTOUCHED);

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
            account can open it.
          </span>
        </p>
      ) : (
        <form action={keep}>
          <input type="hidden" name="name" value={document.name} />
          <input type="hidden" name="format" value={document.format} />
          <input type="hidden" name="text" value={document.text} />
          <p className={aside}>
            Kept against {signer.signer.email}. The text goes to the library. The file
            does not, because it never left your machine.
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
