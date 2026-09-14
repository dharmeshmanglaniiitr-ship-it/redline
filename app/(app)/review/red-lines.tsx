"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { LABEL, ProofMark, STAMP } from "../_components/galley";
import { reviseRedLines } from "./actions";
import type { RedLineEdit, RedLinesState } from "./red-lines-state";

/**
 * The Signer's own red lines: the standard their contracts are marked against.
 *
 * A proof is marked against a house style, and this is the Signer's
 * (`.impeccable/surfaces/app-app-layout-tsx.md`). It is built as a standing document
 * rather than a settings form — a list of lines in their own hand, added to and crossed
 * out — because that is what it is, and because it is why re-ranking on edit belongs to
 * the metaphor rather than being bolted onto it.
 *
 * Editing one sends the document that is already on the screen back through the reading,
 * under the standard as it now stands. Nothing is uploaded again: the text never left the
 * page (`docs/adr/0009`). What comes back has the same marks on the same sentences, in a
 * different order.
 *
 * `DESIGN.md` gives it its form and it invents nothing: the section rule and label of every
 * other block on this sheet, the Signer's own words set in the document face because they
 * are quoted rather than written by Redline, and the stamp for the action. The red lines
 * themselves carry no proof mark — they are the standard, not a correction.
 */
export function RedLines({
  state,
  onState,
  onRevised,
  working,
  marking,
}: {
  state: RedLinesState;
  /** Where the standard the database now holds goes. Lifted, so one screen holds one. */
  onState: (state: RedLinesState) => void;
  /** Called after an edit lands, to read the document on screen again under it. */
  onRevised: () => void;
  /** True while a re-reading is in flight, so the form cannot be sent twice. */
  working: boolean;
  /**
   * Whether there is a document on the screen for an edit to send back through. The
   * standard stands either way — it is set up before the first contract arrives and kept
   * after — so what changes is only what an edit does next, and what the buttons say
   * about it.
   */
  marking: boolean;
}) {
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  function revise(edit: RedLineEdit, afterwards: () => void) {
    startSaving(async () => {
      const next = await reviseRedLines(edit);
      onState(next);
      if (next.status === "held" && next.problem === null) {
        afterwards();
        onRevised();
      }
    });
  }

  if (state.status === "unread") return null;

  const heading = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
      <h2 id="your-red-lines" className={LABEL}>
        What you will not agree to
      </h2>
      {state.status === "held" && (
        <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          {legendFor(state.redLines.length)}
        </span>
      )}
    </div>
  );

  if (state.status === "accounts-not-set-up") {
    return (
      <section aria-labelledby="your-red-lines" className="mt-12">
        {heading}
        <p className="mt-6 max-w-[58ch] text-[0.98rem] leading-[1.55] text-ink-soft">
          Red lines are kept with your account, and this deployment has no database behind
          it yet. Redline is marking against its own standard.
        </p>
      </section>
    );
  }

  if (state.status === "not-signed-in") {
    return (
      <section aria-labelledby="your-red-lines" className="mt-12">
        {heading}
        <p className="mt-6 max-w-[58ch] text-[0.98rem] leading-[1.55] text-ink-soft">
          Redline is marking against its own standard. Write down what you will not agree
          to and it marks against that as well, on this contract and on every one after
          it. Red lines are kept with your account.{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
          >
            Sign in or set up an account
          </Link>
          .
        </p>
      </section>
    );
  }

  const busy = saving || working;
  // What the button says while the edit is in flight. With a contract on the screen the
  // edit is a re-reading of it and takes a few seconds; with none it is just a save.
  const readingLabel = marking ? "Reading again" : "Saving";
  const liveLabel = marking
    ? "Going through the contract again with your red lines."
    : "Saving your red lines.";

  return (
    <section aria-labelledby="your-red-lines" className="mt-12">
      {heading}

      <p className="mt-6 max-w-[58ch] text-[0.98rem] leading-[1.55] text-ink-soft">
        {state.redLines.length === 0
          ? marking
            ? "Nothing here yet, so Redline marked this contract against its own standard: " +
              "worst first, whichever terms those turn out to be. Write down one thing you " +
              "will not agree to and it reads the contract again with that in hand."
            : "Nothing here yet. Write down what you will not agree to and it stays on the " +
              "list for every contract you bring in."
          : "This is what Redline marks your contracts against, alongside its own standard. " +
            "A term that crosses one of these comes to the top, even where Redline reads " +
            "the wording as ordinary. It stays on the list for every contract you bring in."}
      </p>

      {state.redLines.length > 0 && (
        <ul className="mt-7 max-w-[58ch] border-t border-rule">
          {state.redLines.map((redLine) => (
            <li key={redLine.id} className="border-b border-rule py-3.5">
              {editing?.id === redLine.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    revise({ kind: "change", id: redLine.id, text: editing.text }, () =>
                      setEditing(null)
                    );
                  }}
                >
                  <label htmlFor={`red-line-${redLine.id}`} className="sr-only">
                    Change this line
                  </label>
                  <input
                    id={`red-line-${redLine.id}`}
                    value={editing.text}
                    autoFocus
                    onChange={(event) => setEditing({ id: redLine.id, text: event.target.value })}
                    className="block w-full border border-rule bg-transparent p-3 font-document text-[1rem] leading-[1.4] text-ink"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-5">
                    <button
                      type="submit"
                      className={STAMP}
                      disabled={busy || editing.text.trim() === ""}
                    >
                      {busy ? readingLabel : marking ? "Save and read again" : "Save it"}
                    </button>
                    <button type="button" className={QUIET} onClick={() => setEditing(null)}>
                      Leave it as it was
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  {/* The Signer's own words, set in the document face, because they are
                      quoted here and not written by Redline (`DESIGN.md`, Two Voices). */}
                  <p className="max-w-[40ch] flex-1 font-document text-[1.02rem] leading-[1.5] text-ink">
                    {redLine.text}
                  </p>
                  <span className="flex shrink-0 gap-5">
                    <button
                      type="button"
                      className={QUIET}
                      disabled={busy}
                      onClick={() => setEditing({ id: redLine.id, text: redLine.text })}
                    >
                      Change<span className="sr-only"> this red line</span>
                    </button>
                    <button
                      type="button"
                      className={QUIET}
                      disabled={busy}
                      onClick={() => revise({ kind: "remove", id: redLine.id }, () => {})}
                    >
                      Take it off<span className="sr-only"> the list</span>
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-7 max-w-[58ch]"
        onSubmit={(event) => {
          event.preventDefault();
          revise({ kind: "add", text: adding }, () => setAdding(""));
        }}
      >
        <label htmlFor="new-red-line" className={LABEL}>
          Add a line
        </label>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <input
            id="new-red-line"
            name="new-red-line"
            value={adding}
            onChange={(event) => setAdding(event.target.value)}
            placeholder="I do not sign non-competes."
            autoComplete="off"
            className="w-full max-w-[40ch] border border-rule bg-transparent p-3 font-document text-[1rem] leading-[1.4] text-ink placeholder:text-ink-soft"
          />
          <button type="submit" className={STAMP} disabled={busy || adding.trim() === ""}>
            {busy ? readingLabel : "Add it"}
          </button>
        </div>
      </form>

      {state.problem !== null && (
        <p
          role="alert"
          className="mt-5 flex max-w-[58ch] items-start gap-2 text-[0.98rem] leading-[1.5] text-mark-deep"
        >
          <ProofMark kind="query" className="mt-0.5 h-5 w-5" />
          <span>{state.problem}</span>
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {busy ? liveLabel : ""}
      </p>
    </section>
  );
}

/** The quiet action beside a row, in the register the rest of this sheet uses. */
const QUIET =
  "cursor-pointer text-[0.9rem] font-semibold text-ink-soft underline decoration-mark " +
  "decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink " +
  "focus-visible:text-ink disabled:cursor-not-allowed disabled:no-underline";

/**
 * The count, in the register of the legends beside every other heading on this sheet.
 *
 * Zero is written out rather than left blank, the same way the marked count is: a legend
 * that goes quiet is indistinguishable from one that was never filled in.
 */
function legendFor(lines: number): string {
  if (lines === 0) return "Nothing set down";
  return lines === 1 ? "1 line" : `${lines} lines`;
}

/**
 * How the Signer's own standard is said in the margin, beside a mark it moved.
 *
 * Exported so `marked-galley.tsx` and the tests over it say it the same way. It names the
 * count and nothing else; the lines themselves are quoted on the mark, in the Signer's own
 * words.
 */
export function crossedLegend(crossings: number): string {
  return crossings === 1 ? "Crosses a line of yours" : `Crosses ${crossings} of your lines`;
}

/** The margin heading over the Signer's own lines on a mark that meets them. */
export const CROSSED_HEADING = "Against your red lines";
