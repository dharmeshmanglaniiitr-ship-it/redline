"use client";

import { useEffect, useRef, useState } from "react";

import { CHECKLIST_ENTRIES } from "@/lib/analysis/clauses";
import { readPastedText } from "@/lib/document/extract";
import type { ExtractionResult, UnreadableReason } from "@/lib/document/extraction";
import type { ExtractedDocument } from "@/lib/supabase/documents";

import { GalleyFoot, LABEL, Masthead, ProofMark, STAMP } from "../_components/galley";
import { explainDocument, readRedLines } from "./actions";
import { NOT_ASKED, type AnalysisState } from "./analysis-state";
import { ClearedList } from "./cleared-list";
import { GoverningLaw, assumedLawLegend } from "./governing-law";
import { KeepInLibrary } from "./keep-in-library";
import { MarkedGalley } from "./marked-galley";
import { QuestionBox } from "./question-box";
import { readFileInBrowser } from "./read-in-browser";
import { RedLines } from "./red-lines";
import { UNREAD, type RedLinesState } from "./red-lines-state";

type Screen =
  | { phase: "waiting" }
  | { phase: "reading"; name: string }
  | { phase: "done"; result: ExtractionResult };

const PASTED = "Pasted text";

/**
 * What a Signer is told when a document could not be read, and what to do next.
 *
 * Every reason has a message. Adding a reason without one will not compile, which is
 * the point: an unreadable document that quietly fell through to a blank screen would
 * read as a contract with nothing wrong in it, and that is the worst thing this product
 * could say (`docs/spec-v1.md`).
 */
const UNREADABLE: Record<UnreadableReason, { headline: string; explanation: string }> = {
  "no-text-layer": {
    headline: "There is no text in this file.",
    explanation:
      "What it holds is a picture of a contract, which is what you get from a scanner " +
      "or a phone camera. Redline does not read scans. It would have to guess at the " +
      "words, and a quote is worth nothing if the words behind it were misread. Open " +
      "the document where it came from, copy the wording, and paste it below.",
  },
  "too-little-text": {
    headline: "Almost nothing came out of this file.",
    explanation:
      "A few words came through, about as much as a header or a page number. The rest " +
      "of the file is probably scanned pages, which Redline does not read. Copy the " +
      "wording from wherever the document came from and paste it below.",
  },
  "password-protected": {
    headline: "This file is locked.",
    explanation:
      "It wants a password before anything inside it can be read. Open it where it " +
      "came from and save a copy without the password, or paste the wording below.",
  },
  "damaged-file": {
    headline: "This file would not open.",
    explanation:
      "Either it is damaged or it is not the kind of file its name says it is. Ask for " +
      "it again, or paste the wording below.",
  },
  "unsupported-format": {
    headline: "Redline cannot open this kind of file.",
    explanation:
      "It reads PDFs, Word .docx files and plain text. Images and the older .doc " +
      "format are not included. Paste the wording below instead.",
  },
};

export default function ReviewPage() {
  const [screen, setScreen] = useState<Screen>({ phase: "waiting" });
  const [analysis, setAnalysis] = useState<AnalysisState>(NOT_ASKED);
  const [pasted, setPasted] = useState("");
  // The Signer's own answer on the governing law, when they have given one. It outranks
  // whatever the document says (`docs/adr/0007`) and it is held here rather than in the
  // result, so a re-reading — a correction, or a retry after a failure — carries it.
  const [chosenLaw, setChosenLaw] = useState<string | null>(null);
  // A re-reading under a corrected law leaves the report on the screen while it runs. It
  // is the same document and the same marks; only the law has moved, so blanking the
  // sheet back to "working" would take away the thing the Signer was just reading.
  const [rereading, setRereading] = useState(false);
  // The Signer's standing standard, held here rather than inside the editor, because the
  // reading depends on it and there is one of it per screen (`docs/adr/0009`).
  const [redLines, setRedLines] = useState<RedLinesState>(UNREAD);
  const fileInput = useRef<HTMLInputElement>(null);
  const head = useRef<HTMLHeadingElement>(null);

  // Read once, when the screen opens. The analysis reads them again on the server for
  // itself; this copy is what the Signer edits.
  useEffect(() => {
    void readRedLines().then(setRedLines);
  }, []);

  // A read finishing changes the whole sheet, so the reader is put at the top of it
  // rather than left holding a focus ring on a control that has moved.
  useEffect(() => {
    if (screen.phase === "done") head.current?.focus();
  }, [screen]);

  /**
   * A document that was read is explained without being asked for again: a Signer came
   * to find out what they would be agreeing to, not to press a second button. Only the
   * extracted arm has text to send, so an unreadable file cannot reach the analysis.
   */
  async function explain(
    document: ExtractedDocument,
    law: string | null = chosenLaw,
    keepShowing = false
  ) {
    if (keepShowing) setRereading(true);
    else setAnalysis({ status: "working" });

    const next = await explainDocument(
      {
        name: document.name,
        format: document.format,
        text: document.text,
      },
      law
    );
    setAnalysis(next);
    setRereading(false);
  }

  /**
   * A correction to the governing law, which is a re-reading and not a preference.
   *
   * The whole analysis goes back through the server action under the law the Signer
   * named, so the claims that turn on it are written again. `docs/adr/0003` is why the
   * marks themselves do not move: severity comes from the wording, and the wording did
   * not change.
   */
  function setLaw(document: ExtractedDocument, law: string | null) {
    setChosenLaw(law);
    void explain(document, law, true);
  }

  // A newly read document starts with no correction on it, passed explicitly rather than
  // read off state the call that got here has only just cleared.
  function show(result: ExtractionResult) {
    setScreen({ phase: "done", result });
    if (result.outcome === "extracted") void explain(result, null);
  }

  async function readFile(file: File) {
    setAnalysis(NOT_ASKED);
    setChosenLaw(null);
    setScreen({ phase: "reading", name: file.name });
    show(await readFileInBrowser(file));
  }

  function readPaste() {
    setAnalysis(NOT_ASKED);
    setChosenLaw(null);
    show(readPastedText(PASTED, pasted));
  }

  function startOver() {
    setPasted("");
    setAnalysis(NOT_ASKED);
    setChosenLaw(null);
    setRereading(false);
    setScreen({ phase: "waiting" });
  }

  const result = screen.phase === "done" ? screen.result : null;
  const unreadable = result?.outcome === "unreadable" ? UNREADABLE[result.reason] : null;
  const extracted = result?.outcome === "extracted" ? result : null;
  // In the order `analyze()` ranked them: the Signer's own lines first, then worst first
  // (`docs/adr/0009`). Nothing on this screen re-sorts them.
  const flags = analysis.status === "explained" ? analysis.result.flags : [];
  const jurisdiction = analysis.status === "explained" ? analysis.result.jurisdiction : null;

  return (
    <>
      <Masthead
        document={documentLine(screen)}
        law={
          jurisdiction === null ? undefined : (
            // Declared here and corrected in one move, which is what `docs/adr/0007`
            // asks the masthead for. A plain in-page link, not a new control.
            <a
              href="#which-law"
              className="underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
            >
              {assumedLawLegend(jurisdiction)}
            </a>
          )
        }
        state={stateLine(screen, analysis, rereading)}
        alarmed={result?.outcome === "unreadable"}
      />

      {/* The correction made twice: once in the masthead's legend, once stamped on the
          sheet. Keyline only, so it cannot be mistaken for the filled action stamps. */}
      {unreadable && (
        <p className="mt-9 inline-flex items-center gap-3 border-[3px] border-mark-deep px-6 py-3 text-[0.82rem] font-bold uppercase tracking-[0.18em] text-mark-deep">
          <ProofMark kind="strike" className="h-5 w-5" />
          Cannot be read
        </p>
      )}

      <h1
        ref={head}
        tabIndex={-1}
        className={`${unreadable ? "mt-7" : "mt-9"} max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink`}
      >
        {unreadable
          ? unreadable.headline
          : extracted
            ? "Here is what Redline read."
            : "Read the contract before you sign it."}
      </h1>

      <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">
        {unreadable
          ? unreadable.explanation
          : extracted
            ? "Below is what the contract commits you to, and under that the wording " +
              "Redline read. Check that wording against your own copy. The file itself " +
              "stayed on your machine; only this text goes any further."
            : "Choose the file your client sent, or paste the wording straight in. Either " +
              "way it is read here in your browser. The file never leaves your machine."}
      </p>

      {/* The state of the read, for anyone who is not watching the sheet change. */}
      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus(screen, analysis, rereading)}
      </p>

      {result?.outcome === "unreadable" && result.foundText !== "" && (
        <div className="mt-9 max-w-[64rem] border-t border-rule pt-6">
          <h2 className={LABEL}>All that came out of the file</h2>
          <p className="mt-3 max-w-[58ch] whitespace-pre-line font-document text-[1.06rem] leading-[1.62] text-ink">
            {result.foundText}
          </p>
        </div>
      )}

      {extracted === null && (
        <section aria-labelledby="bring-it-in" className="mt-12 max-w-[64rem]">
          <h2 id="bring-it-in" className="sr-only">
            Bring a document in
          </h2>

          <div className="grid gap-x-10 gap-y-10 border-t border-rule pt-8 lg:grid-cols-2">
            <div>
              <h3 className={LABEL}>From your machine</h3>
              <p className="mt-3 max-w-[40ch] text-[0.94rem] leading-[1.55] text-ink-soft">
                PDFs, Word .docx files and plain text. The file is opened here in the
                browser and never uploaded.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void readFile(file);
                }}
              />
              <button
                type="button"
                className={`${STAMP} mt-6`}
                onClick={() => fileInput.current?.click()}
                disabled={screen.phase === "reading"}
              >
                {screen.phase === "reading" ? "Reading" : "Choose a file"}
              </button>
            </div>

            <div className="lg:border-l lg:border-rule lg:pl-10">
              <h3 className={LABEL}>Or paste the wording</h3>
              <p className="mt-3 max-w-[40ch] text-[0.94rem] leading-[1.55] text-ink-soft">
                Works for anything you can select and copy, including a contract sitting
                in an email.
              </p>
              <label htmlFor="pasted" className="sr-only">
                The wording of the contract
              </label>
              <textarea
                id="pasted"
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={6}
                placeholder="Paste the contract here."
                className="mt-4 block w-full max-w-[58ch] border border-rule bg-transparent p-3 font-document text-[1rem] leading-[1.6] text-ink placeholder:text-ink-soft"
              />
              <button
                type="button"
                className={`${STAMP} mt-4`}
                onClick={readPaste}
                disabled={pasted.trim() === ""}
              >
                Read this text
              </button>
            </div>
          </div>
        </section>
      )}

      {/* The standard stands whether or not there is a document under it, because it is
          not about this contract — it is what every contract gets read against. Setting it
          up before the first one is brought in is the point of it persisting. */}
      {extracted === null && (
        <RedLines
          state={redLines}
          onState={setRedLines}
          onRevised={() => {}}
          working={false}
          marking={false}
        />
      )}

      {/* Nothing stands under this heading until the reading has started, so the section
          arrives with the first thing it has to say rather than as an empty frame. */}
      {extracted && analysis.status !== "not-asked" && (
        <section aria-labelledby="what-it-commits-you-to" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
            <h2 id="what-it-commits-you-to" className={LABEL}>
              What this commits you to
            </h2>
            <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              {analysisLegend(analysis)}
            </span>
          </div>

          {analysis.status === "working" && (
            <p className="mt-7 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">
              Redline is reading it now. This takes a few seconds on a long contract.
            </p>
          )}

          {analysis.status === "explained" && (
            <>
              <div className="mt-7 max-w-[58ch] space-y-6">
                <div>
                  <h3 className={LABEL}>Sent by</h3>
                  {/* The Sender's name is the document's own words, so it is set in the
                      document's face and not in Redline's (`DESIGN.md`). */}
                  <p className="mt-2 font-document text-[1.06rem] leading-[1.4] text-ink">
                    {analysis.result.summary.sender}
                  </p>
                </div>
                <div>
                  <h3 className={LABEL}>The work</h3>
                  <p className="mt-2 text-[1.05rem] leading-[1.5] text-ink">
                    {analysis.result.summary.engagement}
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-[58ch] space-y-5 border-t border-rule pt-7 text-[1.05rem] leading-[1.5] text-ink">
                {analysis.result.summary.plainEnglish
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter((paragraph) => paragraph !== "")
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>

              {/* The query mark, because this is the thing left unresolved. A summary
                  with nothing after it would read as a contract with nothing wrong in
                  it, which is the worst thing this product could say
                  (`docs/spec-v1.md`), so what has not been done is said here. */}
              <div className="mt-9 flex max-w-[58ch] items-start gap-3 border-t border-rule pt-5">
                <ProofMark kind="query" className="mt-0.5 h-5 w-5 text-mark" />
                <p className="text-[0.94rem] leading-[1.55] text-ink-soft">
                  What is above says what the contract contains. Next is the law Redline
                  read it under, then the checklist it went through, then the terms that
                  would cost you, marked in the wording itself with a line to send back on
                  each one. Under that is a box for anything the marks did not cover.
                </p>
              </div>
            </>
          )}

          {(analysis.status === "model-not-set-up" ||
            analysis.status === "nothing-to-read" ||
            analysis.status === "failed") && (
            <div role="alert" className="mt-7 max-w-[58ch]">
              <p className="flex items-start gap-3 text-[1.05rem] leading-[1.5] text-mark-deep">
                <ProofMark kind="query" className="mt-1 h-5 w-5" />
                <span>
                  {analysis.status === "model-not-set-up"
                    ? "Redline has no model to call on this deployment, so it read your " +
                      "document but cannot explain it. The wording is below, as it came " +
                      "out of the file."
                    : analysis.status === "nothing-to-read"
                      ? "There was not enough text here for Redline to work from."
                      : analysis.message}
                </span>
              </p>
              {analysis.status === "failed" && (
                <button
                  type="button"
                  className={`${STAMP} mt-6`}
                  onClick={() => void explain(extracted)}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Which law the reading was made under, declared and correctable, before either
          list (`docs/adr/0007`). It comes first of the three because it frames the other
          two: a Signer needs to know whose law the enforceability lines are written
          against before they read a finding that names one, or one that pointedly does
          not. */}
      {extracted && analysis.status === "explained" && (
        <GoverningLaw
          jurisdiction={analysis.result.jurisdiction}
          working={rereading}
          onSet={(law) => setLaw(extracted, law)}
        />
      )}

      {/* The standard this was marked against, under the law it was read under. The two
          are the same kind of thing — what the reading was made against rather than what
          it found — and both are correctable in place. Editing a line reads the document
          that is already here again; nothing is uploaded twice (`docs/adr/0009`). */}
      {extracted && analysis.status === "explained" && (
        <RedLines
          state={redLines}
          onState={setRedLines}
          onRevised={() => void explain(extracted, chosenLaw, true)}
          working={rereading}
          marking
        />
      )}

      {/* The other half of the report, and the half that only means anything because
          there is a real checklist under it (`docs/adr/0004`). It stands between the
          summary and the marked wording, so a Signer meets what was looked at before
          they meet what was found. */}
      {analysis.status === "explained" && (
        <ClearedList cleared={analysis.result.checkedClean} />
      )}

      {extracted && (
        <section aria-labelledby="the-text" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
            <h2 id="the-text" className={LABEL}>
              {extracted.name}
            </h2>
            <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
              {analysis.status === "explained" && (
                <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                  {markedLegend(flags.length)}
                </span>
              )}
              <button
                type="button"
                className="cursor-pointer text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
                onClick={startOver}
              >
                Read a different document
              </button>
            </div>
          </div>

          {/* Nothing found is a real answer, and it is only worth anything said beside
              the list of what was looked at — "no marks" on its own reads as a contract
              that passed (`docs/spec-v1.md`), which is why this points back up at the
              checklist rather than standing on its own. */}
          {analysis.status === "explained" && flags.length === 0 && (
            <div className="mt-7 flex max-w-[58ch] items-start gap-3">
              <ProofMark kind="query" className="mt-0.5 h-5 w-5 text-mark" />
              <p className="text-[0.98rem] leading-[1.55] text-ink-soft">
                Nothing in this wording is marked. The list above is what Redline checked
                to get to that answer, so read the two together.
              </p>
            </div>
          )}

          {flags.length > 0 ? (
            <MarkedGalley documentText={extracted.text} flags={flags} />
          ) : (
            <div className="mt-7 max-w-[58ch] space-y-6 font-document text-[1.06rem] leading-[1.62] text-ink">
              {extracted.text.split("\n\n").map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Only a document that was read can be kept, and the type says so: the
              unreadable arm carries no text to pass. */}
          <KeepInLibrary
            document={extracted}
            analysis={analysis.status === "explained" ? analysis.result : null}
          />
        </section>
      )}

      {/* The query box, and it stands under the marked wording rather than over it: a
          Signer asks about what the marks did not cover, so they have to have met the
          marks first (`.impeccable/surfaces/app-app-layout-tsx.md`).

          It is offered after a reading that failed as well as after one that came back,
          because the two calls are separate: a summary that did not arrive is no reason to
          stop a Signer asking about the contract in front of them. It is withheld only
          where asking could not work — nothing read on this deployment, or no text to read
          it out of. */}
      {extracted && (analysis.status === "explained" || analysis.status === "failed") && (
        <QuestionBox document={extracted} />
      )}

      <GalleyFoot
        parts={[
          "Redline",
          "Read in this browser. The file stayed on your machine",
          footState(screen),
        ]}
      />
    </>
  );
}

function documentLine(screen: Screen): string {
  if (screen.phase === "waiting") return "No document yet";
  if (screen.phase === "reading") return screen.name;
  return screen.result.name;
}

function stateLine(screen: Screen, analysis: AnalysisState, rereading: boolean): string {
  if (screen.phase === "waiting") return "Nothing read yet";
  if (screen.phase === "reading") return "Reading";
  if (screen.result.outcome === "unreadable") return "Cannot be read";

  const read = `${screen.result.sentences.length} sentences read`;
  if (rereading) return `${read} · going through it again`;
  switch (analysis.status) {
    case "not-asked":
      return read;
    case "working":
      return `${read} · working through it`;
    case "explained":
      return `${read} · ${markedLegend(analysis.result.flags.length)}`;
    default:
      return `${read} · no summary`;
  }
}

/**
 * How many terms carry a mark, said the same way in the masthead, beside the document
 * and to a screen reader. Zero is written out rather than left blank: a legend that goes
 * quiet is indistinguishable from one that was never filled in.
 */
function markedLegend(marks: number): string {
  if (marks === 0) return "Nothing marked";
  return marks === 1 ? "1 term marked" : `${marks} terms marked`;
}

/** The legend beside the summary's own heading, saying where the reading has got to. */
function analysisLegend(analysis: AnalysisState): string {
  switch (analysis.status) {
    case "not-asked":
      return "";
    case "working":
      return "Reading";
    case "explained":
      return "Read once, by a model";
    case "model-not-set-up":
      return "Not switched on here";
    case "nothing-to-read":
      return "Nothing to read";
    case "failed":
      return "Did not come back";
  }
}

function footState(screen: Screen): string {
  if (screen.phase !== "done") return "Sheet 1 of 1";
  return screen.result.outcome === "extracted" ? "Sheet 1 of 1" : "Nothing to mark";
}

function liveStatus(screen: Screen, analysis: AnalysisState, rereading: boolean): string {
  if (screen.phase === "waiting") return "";
  if (screen.phase === "reading") return `Reading ${screen.name}.`;
  if (screen.result.outcome === "unreadable") {
    return `${screen.result.name} could not be read. ${UNREADABLE[screen.result.reason].headline}`;
  }

  const read = `${screen.result.name} read. ${screen.result.sentences.length} sentences.`;
  if (rereading) return `${read} Going through it again under the law you set.`;
  switch (analysis.status) {
    case "not-asked":
      return read;
    case "working":
      return `${read} Working out what it commits you to.`;
    case "explained": {
      const marks = analysis.result.flags.length;
      const marked =
        marks === 0
          ? "Nothing in it is marked."
          : marks === 1
            ? "One term is marked below."
            : `${marks} terms are marked below, worst first.`;
      // The clean half is announced too. A reader who cannot see the list would
      // otherwise hear "nothing is marked" and have no way to tell that from silence.
      const clean = `${analysis.result.checkedClean.length} of ${CHECKLIST_ENTRIES.length} checks came back clean.`;
      // The law is announced too, and the unknown case loudest of all: a reader who
      // cannot see the masthead would otherwise never learn that nothing was assumed.
      const law =
        analysis.result.jurisdiction.source === "undetermined"
          ? "This contract does not say which law governs it, and Redline has not picked one."
          : `Read under the law of ${analysis.result.jurisdiction.name}.`;
      return `${read} A summary of what it commits you to is below. ${law} ${marked} ${clean}`;
    }
    case "model-not-set-up":
      return `${read} Redline cannot explain it on this deployment.`;
    case "nothing-to-read":
      return `${read} There was not enough text in it to explain.`;
    case "failed":
      return `${read} The explanation did not come back.`;
  }
}
