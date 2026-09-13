"use client";

import { useEffect, useRef, useState } from "react";

import { readPastedText } from "@/lib/document/extract";
import type { ExtractionResult, UnreadableReason } from "@/lib/document/extraction";

import { GalleyFoot, LABEL, Masthead, ProofMark, STAMP } from "../_components/galley";
import { readFileInBrowser } from "./read-in-browser";

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
  const [pasted, setPasted] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const head = useRef<HTMLHeadingElement>(null);

  // A read finishing changes the whole sheet, so the reader is put at the top of it
  // rather than left holding a focus ring on a control that has moved.
  useEffect(() => {
    if (screen.phase === "done") head.current?.focus();
  }, [screen]);

  async function readFile(file: File) {
    setScreen({ phase: "reading", name: file.name });
    setScreen({ phase: "done", result: await readFileInBrowser(file) });
  }

  function readPaste() {
    setScreen({ phase: "done", result: readPastedText(PASTED, pasted) });
  }

  function startOver() {
    setPasted("");
    setScreen({ phase: "waiting" });
  }

  const result = screen.phase === "done" ? screen.result : null;
  const unreadable = result?.outcome === "unreadable" ? UNREADABLE[result.reason] : null;
  const extracted = result?.outcome === "extracted" ? result : null;

  return (
    <>
      <Masthead
        document={documentLine(screen)}
        state={stateLine(screen)}
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
            ? "This is the wording Redline will work from. Check it against your own copy. " +
              "The file itself stayed on your machine; only this text goes any further."
            : "Choose the file your client sent, or paste the wording straight in. Either " +
              "way it is read here in your browser. The file never leaves your machine."}
      </p>

      {/* The state of the read, for anyone who is not watching the sheet change. */}
      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus(screen)}
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

      {extracted && (
        <section aria-labelledby="the-text" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
            <h2 id="the-text" className={LABEL}>
              {extracted.name}
            </h2>
            <button
              type="button"
              className="cursor-pointer text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
              onClick={startOver}
            >
              Read a different document
            </button>
          </div>

          <div className="mt-7 max-w-[58ch] space-y-6 font-document text-[1.06rem] leading-[1.62] text-ink">
            {extracted.text.split("\n\n").map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
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

function stateLine(screen: Screen): string {
  if (screen.phase === "waiting") return "Nothing read yet";
  if (screen.phase === "reading") return "Reading";
  if (screen.result.outcome === "unreadable") return "Cannot be read";
  return `${screen.result.sentences.length} sentences read`;
}

function footState(screen: Screen): string {
  if (screen.phase !== "done") return "Sheet 1 of 1";
  return screen.result.outcome === "extracted" ? "Sheet 1 of 1" : "Nothing to mark";
}

function liveStatus(screen: Screen): string {
  if (screen.phase === "waiting") return "";
  if (screen.phase === "reading") return `Reading ${screen.name}.`;
  if (screen.result.outcome === "unreadable") {
    return `${screen.result.name} could not be read. ${UNREADABLE[screen.result.reason].headline}`;
  }
  return `${screen.result.name} read. ${screen.result.sentences.length} sentences.`;
}
