"use client";

import { useState } from "react";

import type { Jurisdiction } from "@/lib/analysis/result";

import { LABEL, ProofMark, STAMP } from "../_components/galley";

/**
 * Which law the analysis read under, and the Signer's way of correcting it.
 *
 * `docs/adr/0007` gives this three states and no fourth. A law read out of the contract's
 * own governing-law clause, carrying that clause so it can be checked. A law the Signer
 * set, carrying the detection it overrode, because a contract sending disputes a long way
 * from where somebody works is a term of the deal and not a detail. Or nothing — which is
 * a state, not a gap, and the one thing it never quietly becomes is the United States.
 *
 * The correction is a form and it re-runs the reading. Nothing here stores a preference
 * for something else to notice later: `onSet` goes back through the server action that
 * produced the analysis on the screen, and what comes back is the whole thing read again.
 * Severity does not move — that comes from the wording, which the law does not change
 * (`docs/adr/0003`) — but every claim that turns on the law is written again, named this
 * time instead of withheld.
 *
 * `DESIGN.md` gives it its form and it invents nothing: the section rule and label of
 * every other block on this sheet, the quoted clause set in the document's own face, the
 * query mark on the state where something is unresolved, and the stamp for the action.
 */
export function GoverningLaw({
  jurisdiction,
  working,
  onSet,
}: {
  jurisdiction: Jurisdiction;
  /** True while a re-reading is in flight, so the form cannot be sent twice. */
  working: boolean;
  /** A name to read it under, or null to drop back to whatever the contract says. */
  onSet: (name: string | null) => void;
}) {
  const [typed, setTyped] = useState("");
  const detected = jurisdiction.source === "signer" ? jurisdiction.detected : null;

  return (
    <section aria-labelledby="which-law" className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
        <h2 id="which-law" className={LABEL}>
          Which law this was read under
        </h2>
        <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          {assumedLawLegend(jurisdiction)}
        </span>
      </div>

      {jurisdiction.source === "undetermined" && (
        <div className="mt-6 flex max-w-[58ch] items-start gap-3">
          <ProofMark kind="query" className="mt-0.5 h-5 w-5 text-mark" />
          <div className="space-y-4 text-[1.05rem] leading-[1.5] text-ink">
            <p>
              This contract never says whose law it runs under. Redline does not know,
              and it has not picked one for you.
            </p>
            <p className="text-[0.98rem] text-ink-soft">
              The rest of the reading stands. What the contract says is the same wherever
              you sign it. What the law would do about it is the part left open below,
              because guessing at that would be worse than leaving it. Tell Redline where
              you are signing and it will read the whole thing again.
            </p>
          </div>
        </div>
      )}

      {jurisdiction.source === "document" && (
        <div className="mt-6 max-w-[58ch] space-y-4">
          <p className="text-[1.05rem] leading-[1.5] text-ink">
            Redline read this under the law of {jurisdiction.name}, because the contract
            says so itself.
          </p>
          <blockquote className="border-l-2 border-rule pl-4 font-document text-[1.02rem] leading-[1.6] text-ink">
            {jurisdiction.sourceSentence}
          </blockquote>
          <p className="text-[0.98rem] leading-[1.55] text-ink-soft">
            Search your own copy for that sentence. If it is not there, or you are signing
            under something else, put the right one in below.
          </p>
        </div>
      )}

      {jurisdiction.source === "signer" && (
        <div className="mt-6 max-w-[58ch] space-y-4">
          <p className="text-[1.05rem] leading-[1.5] text-ink">
            You told Redline to read this under {jurisdiction.name}, so that is what it
            did.
          </p>
          {detected === null ? (
            <p className="text-[0.98rem] leading-[1.55] text-ink-soft">
              The contract itself names no law, so nothing here disagrees with you.
            </p>
          ) : (
            <>
              <p className="text-[0.98rem] leading-[1.55] text-ink-soft">
                The contract names {detected.name}. Where a dispute would be heard is a
                term you are agreeing to, so it is worth reading even though Redline went
                with yours.
              </p>
              <blockquote className="border-l-2 border-rule pl-4 font-document text-[1.02rem] leading-[1.6] text-ink">
                {detected.sourceSentence}
              </blockquote>
            </>
          )}
        </div>
      )}

      <form
        className="mt-7 max-w-[58ch]"
        onSubmit={(event) => {
          event.preventDefault();
          const name = typed.trim();
          if (name === "") return;
          setTyped("");
          onSet(name);
        }}
      >
        <label htmlFor="governing-law" className={LABEL}>
          {jurisdiction.source === "undetermined"
            ? "Which law are you signing under"
            : "Read it under a different law"}
        </label>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <input
            id="governing-law"
            name="governing-law"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="England and Wales"
            autoComplete="off"
            className="w-full max-w-[26ch] border border-rule bg-transparent p-3 font-document text-[1rem] leading-[1.4] text-ink placeholder:text-ink-soft"
          />
          <button type="submit" className={STAMP} disabled={working || typed.trim() === ""}>
            {working ? "Reading" : "Read it again"}
          </button>
        </div>
      </form>

      {jurisdiction.source === "signer" && (
        <button
          type="button"
          className="mt-5 cursor-pointer text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink disabled:cursor-not-allowed disabled:no-underline"
          disabled={working}
          onClick={() => onSet(null)}
        >
          {detected === null
            ? "Clear that and leave it open"
            : "Go back to what the contract says"}
        </button>
      )}
    </section>
  );
}

/**
 * The same fact in the masthead's register: short, uppercase, beside the document and its
 * state (`DESIGN.md`, Masthead and galley foot).
 *
 * The undetermined line says so out loud rather than going quiet. A masthead that simply
 * omits the law when there is none is indistinguishable from one that never had the job,
 * which is the failure `docs/adr/0007` is built around.
 */
export function assumedLawLegend(jurisdiction: Jurisdiction): string {
  switch (jurisdiction.source) {
    case "undetermined":
      return "Governing law not known";
    case "document":
      return `Read under ${jurisdiction.name}`;
    case "signer":
      return `Read under ${jurisdiction.name}, set by you`;
  }
}
