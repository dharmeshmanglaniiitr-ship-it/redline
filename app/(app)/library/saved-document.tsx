"use client";

/**
 * One saved document, opened on the reading it was saved with.
 *
 * `docs/adr/0010` is the whole shape of this screen. The reading a document was kept with
 * is the record of what the Signer was shown on the day they decided, so that is what
 * opens — with no model call, and no difference between opening it today and opening it in
 * six months on a deployment whose model is unreachable. Reading it again is something they
 * ask for: it is labelled as today's reading, it sits in place of the record while they
 * look at it, and one control puts the record back. Nothing they ask for is written down.
 *
 * Which of the two is on the screen is said in three places — the masthead legend, the
 * block below the head, and the live region — because "am I looking at what I acted on?" is
 * the question this screen exists to answer, and a Signer should never have to work it out
 * from the content.
 *
 * Every component here is the review sheet's own. A saved document is the same marked proof
 * it was when it was made, so it is set the same way: the paired marks, the cleared list,
 * the same masthead and foot (`DESIGN.md`). Nothing is invented for the library.
 */

import Link from "next/link";
import { useState } from "react";

import { CHECKLIST_ENTRIES } from "@/lib/analysis/clauses";
import { assumedJurisdictionName, type AnalysisResult } from "@/lib/analysis/result";

import { GalleyFoot, LABEL, Masthead, ProofMark, STAMP } from "../_components/galley";
import { explainDocument } from "../review/actions";
import { NOT_ASKED, type AnalysisState } from "../review/analysis-state";
import { ClearedList } from "../review/cleared-list";
import { assumedLawLegend } from "../review/governing-law";
import { MarkedGalley } from "../review/marked-galley";
import type { KeptReading } from "./saved-state";

export function SavedDocument({
  document,
  keptOn,
  reading,
}: {
  /** The wording as it was stored. The file itself was never stored (`CLAUDE.md`). */
  document: { readonly name: string; readonly format: string; readonly text: string };
  /** The day it went into the library, already written out. */
  keptOn: string;
  reading: KeptReading;
}) {
  const [fresh, setFresh] = useState<AnalysisState>(NOT_ASKED);
  const [showing, setShowing] = useState<"kept" | "today">("kept");

  async function readAgain() {
    setShowing("today");
    setFresh({ status: "working" });
    setFresh(await explainDocument(document));
  }

  const showingToday = showing === "today";
  const kept = reading.status === "kept" ? reading.result : null;
  const today = fresh.status === "explained" ? fresh.result : null;
  const result: AnalysisResult | null = showingToday ? today : kept;
  const flags = result?.flags ?? [];

  return (
    <>
      <Masthead
        document={document.name}
        law={
          result === null ? undefined : (
            <span>{assumedLawLegend(result.jurisdiction)}</span>
          )
        }
        state={stateLine(showingToday, fresh, reading, keptOn, flags.length)}
        alarmed={reading.status === "unreadable" && !showingToday}
      />

      <h1
        className={`mt-9 max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink`}
      >
        {showingToday ? "What Redline makes of it today." : "What Redline said about this."}
      </h1>

      <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">
        {showingToday
          ? "This reading was made just now. It is not saved, and the one you kept is " +
            "still there, exactly as it was."
          : "Below is the wording that was saved, and the marks on it are the ones it " +
            "carried when you kept it. Nothing has been read again."}
      </p>

      {/* Which reading this is, said plainly and with the way to the other one. This block
          is `docs/adr/0010`'s visible half: the decision is only worth anything if a
          Signer can tell, without checking, which reading they are holding. */}
      <section aria-labelledby="which-reading" className="mt-11 max-w-[64rem]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
          <h2 id="which-reading" className={LABEL}>
            Which reading this is
          </h2>
          <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            {showingToday ? "Read just now" : "As you kept it"}
          </span>
        </div>

        <div className="mt-5 flex max-w-[58ch] items-start gap-3">
          <ProofMark kind="query" className="mt-0.5 h-5 w-5 text-mark" />
          <div className="space-y-4 text-[0.98rem] leading-[1.55] text-ink-soft">
            <p>{whichReading(showingToday, fresh, reading, keptOn)}</p>
            {result !== null && (
              <p>{markedAgainst(result, showingToday)}</p>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
          <button
            type="button"
            className={STAMP}
            onClick={() => void readAgain()}
            disabled={showingToday && fresh.status === "working"}
          >
            {showingToday && fresh.status === "working" ? "Reading" : "Read it again now"}
          </button>
          {showingToday && (
            <button
              type="button"
              className="cursor-pointer text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
              onClick={() => setShowing("kept")}
            >
              Back to the reading you kept
            </button>
          )}
        </div>
      </section>

      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus(showingToday, fresh, reading, keptOn, flags.length)}
      </p>

      {/* Whatever stands in the way of there being a report to read, said where the report
          would be rather than left as an empty page. */}
      {result === null && (
        <div role={showingToday ? "alert" : undefined} className="mt-11 max-w-[58ch]">
          <p className="flex items-start gap-3 text-[1.05rem] leading-[1.5] text-mark-deep">
            <ProofMark kind="query" className="mt-1 h-5 w-5" />
            <span>{nothingToShow(showingToday, fresh, reading)}</span>
          </p>
        </div>
      )}

      {result !== null && (
        <>
          <section aria-labelledby="what-it-commits-you-to" className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
              <h2 id="what-it-commits-you-to" className={LABEL}>
                What this commits you to
              </h2>
              <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                {showingToday ? "Read just now" : `Read ${readingDate(reading, keptOn)}`}
              </span>
            </div>

            <div className="mt-7 max-w-[58ch] space-y-6">
              <div>
                <h3 className={LABEL}>Sent by</h3>
                <p className="mt-2 font-document text-[1.06rem] leading-[1.4] text-ink">
                  {result.summary.sender}
                </p>
              </div>
              <div>
                <h3 className={LABEL}>The work</h3>
                <p className="mt-2 text-[1.05rem] leading-[1.5] text-ink">
                  {result.summary.engagement}
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-[58ch] space-y-5 border-t border-rule pt-7 text-[1.05rem] leading-[1.5] text-ink">
              {result.summary.plainEnglish
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter((paragraph) => paragraph !== "")
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </section>

          {/* Which law the reading was made under, declared before either list
              (`docs/adr/0007`). It is stated rather than correctable here: correcting it
              would be a different reading, and a different reading is not the record. */}
          <section aria-labelledby="which-law" className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
              <h2 id="which-law" className={LABEL}>
                Which law this was read under
              </h2>
              <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                {assumedLawLegend(result.jurisdiction)}
              </span>
            </div>

            {result.jurisdiction.source === "undetermined" ? (
              <p className="mt-6 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink">
                This contract never says whose law it runs under, and Redline did not pick
                one. Everything above still stands: what the contract says is the same
                wherever you signed it.
              </p>
            ) : (
              <div className="mt-6 max-w-[58ch] space-y-4">
                <p className="text-[1.05rem] leading-[1.5] text-ink">
                  {result.jurisdiction.source === "document"
                    ? `Redline read this under the law of ${result.jurisdiction.name}, because the contract says so itself.`
                    : `You told Redline to read this under ${result.jurisdiction.name}, so that is what it did.`}
                </p>
                {lawSentence(result) !== null && (
                  <blockquote className="border-l-2 border-rule pl-4 font-document text-[1.02rem] leading-[1.6] text-ink">
                    {lawSentence(result)}
                  </blockquote>
                )}
              </div>
            )}
          </section>

          <ClearedList cleared={result.checkedClean} />
        </>
      )}

      <section aria-labelledby="the-text" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
          <h2 id="the-text" className={LABEL}>
            {document.name}
          </h2>
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
            {result !== null && (
              <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                {marksLegend(flags.length)}
              </span>
            )}
            <Link
              href="/library"
              className="text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
            >
              Back to your library
            </Link>
          </div>
        </div>

        {result !== null && flags.length === 0 && (
          <div className="mt-7 flex max-w-[58ch] items-start gap-3">
            <ProofMark kind="query" className="mt-0.5 h-5 w-5 text-mark" />
            <p className="text-[0.98rem] leading-[1.55] text-ink-soft">
              Nothing in this wording is marked. The list above is what Redline checked to
              get to that answer, so read the two together.
            </p>
          </div>
        )}

        {flags.length > 0 ? (
          <MarkedGalley documentText={document.text} flags={flags} />
        ) : (
          <div className="mt-7 max-w-[58ch] space-y-6 font-document text-[1.06rem] leading-[1.62] text-ink">
            {document.text.split("\n\n").map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </section>

      <GalleyFoot
        parts={[
          "Redline",
          `Kept ${keptOn}. The file was never stored`,
          showingToday ? "Read again, not saved" : "As you kept it",
        ]}
      />
    </>
  );
}

/** The governing-law clause the reading quoted, where there is one to quote. */
function lawSentence(result: AnalysisResult): string | null {
  const { jurisdiction } = result;
  if (jurisdiction.source === "document") return jurisdiction.sourceSentence;
  if (jurisdiction.source === "signer") return jurisdiction.detected?.sourceSentence ?? null;
  return null;
}

function marksLegend(marks: number): string {
  if (marks === 0) return "Nothing marked";
  return marks === 1 ? "1 term marked" : `${marks} terms marked`;
}

function readingDate(reading: KeptReading, keptOn: string): string {
  return reading.status === "kept" ? reading.readOn : keptOn;
}

/** The masthead's own state line, which always says which reading is on the sheet. */
function stateLine(
  showingToday: boolean,
  fresh: AnalysisState,
  reading: KeptReading,
  keptOn: string,
  marks: number
): string {
  if (showingToday) {
    switch (fresh.status) {
      case "working":
        return "Reading it again";
      case "explained":
        return `Read just now · ${marksLegend(marks)}`;
      default:
        return "Read again · nothing came back";
    }
  }
  if (reading.status === "kept") return `Kept ${reading.readOn} · ${marksLegend(marks)}`;
  if (reading.status === "none") return `Kept ${keptOn} · no reading`;
  return `Kept ${keptOn} · reading did not open`;
}

/** The same fact at reading length, under the head. */
function whichReading(
  showingToday: boolean,
  fresh: AnalysisState,
  reading: KeptReading,
  keptOn: string
): string {
  if (showingToday) {
    if (fresh.status === "working") return "Redline is going through it again now.";
    return (
      "You are looking at a reading made just now, not the one you kept. Redline changes " +
      "as it is worked on, so this can differ from what you saw at the time, and what you " +
      "saw at the time is what you acted on. Nothing has been written over."
    );
  }
  if (reading.status === "kept") {
    return (
      `You are looking at the reading this document was kept with, made ${reading.readOn}. ` +
      "It is stored word for word, so nothing was read again to put it on the screen. " +
      "Redline may read this contract differently today; if that matters, ask it to."
    );
  }
  if (reading.status === "none") {
    return (
      `This document was kept on ${keptOn} with the wording only. There was no reading to ` +
      "keep with it, so what is below is the text and nothing more."
    );
  }
  return (
    `This document was kept on ${keptOn}, but the reading stored with it no longer lines ` +
    "up with the wording underneath. Showing half of it would be worse than showing none, " +
    "so none of it is here. The text itself is untouched and is below."
  );
}

/** What the reading was marked against, which is Redline's checklist and the Signer's own. */
function markedAgainst(result: AnalysisResult, showingToday: boolean): string {
  const lines = result.redLines.length;
  const checklist = `All ${CHECKLIST_ENTRIES.length} of Redline's checks were run`;

  if (lines === 0) {
    return showingToday
      ? `${checklist}. You have no red lines of your own on the list.`
      : `${checklist}. You had no red lines of your own at the time.`;
  }
  const own = lines === 1 ? "one line of your own" : `${lines} lines of your own`;
  return showingToday
    ? `${checklist}, against ${own} as they stand now.`
    : `${checklist}, against ${own} as they stood that day.`;
}

/** What stands in the way of there being a report, said where the report would be. */
function nothingToShow(
  showingToday: boolean,
  fresh: AnalysisState,
  reading: KeptReading
): string {
  if (showingToday) {
    switch (fresh.status) {
      case "working":
        return "Redline is reading it now. This takes a few seconds on a long contract.";
      case "model-not-set-up":
        return (
          "Redline has no model to call on this deployment, so it cannot read this again. " +
          "What you kept is still here. Go back to it."
        );
      case "nothing-to-read":
        return "There was not enough text here for Redline to work from.";
      case "failed":
        return `${fresh.message} What you kept is still here, untouched.`;
      default:
        return "Nothing came back from that reading. What you kept is still here.";
    }
  }
  if (reading.status === "none") {
    return (
      "No reading was kept with this one, so there is nothing here to show you. The " +
      "wording is below, and Redline can read it now if you want that."
    );
  }
  return (
    "The reading kept with this document does not check out against the wording below, so " +
    "Redline will not show you part of it and call it the record. Reading it again gives " +
    "you one that lines up with the text."
  );
}

function liveStatus(
  showingToday: boolean,
  fresh: AnalysisState,
  reading: KeptReading,
  keptOn: string,
  marks: number
): string {
  const which = whichReading(showingToday, fresh, reading, keptOn);
  if (showingToday && fresh.status !== "explained") return which;
  if (!showingToday && reading.status !== "kept") return which;
  return `${which} ${marksLegend(marks)} below.`;
}
