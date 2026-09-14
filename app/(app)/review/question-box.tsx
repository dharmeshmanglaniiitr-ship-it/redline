"use client";

/**
 * The question box: an author's query, written in the margin and answered there.
 *
 * `.impeccable/surfaces/app-app-layout-tsx.md` sets the mapping this follows. A query on a
 * proof is written in the margin, and an unanswerable one comes back marked unresolved
 * rather than as a blank. So every exchange below is laid out as a galley — what Redline
 * has to say on the left at reading measure, the query mark and its state in the margin at
 * 18rem, stacking to one column below 1024px, which is `DESIGN.md`'s signature structure
 * and not a shape invented here. No cards, no fills, hairline rules between exchanges.
 *
 * Two things a reader sees are worth calling out.
 *
 * **An answer shows the sentence it came from.** Set in the document's own face, because
 * the words are the document's (`DESIGN.md`, The Two Voices Rule), under a label saying
 * what it is. That is the whole point of the box: a Signer checks an answer the same way
 * they check a flag, by searching their own copy for the quoted string.
 *
 * **A refusal is marked unresolved and given the same room as an answer.** It is not an
 * error state and it is not drawn as one. The contract being silent on a point a Signer
 * asked about is a real finding, and the query sits in the margin unanswered because that
 * is what the document did.
 */

import { useId, useRef, useState } from "react";

import type { ExtractedDocument } from "@/lib/supabase/documents";
import { clauseReferenceIn } from "@/lib/text/marking";

import { LABEL, ProofMark, STAMP } from "../_components/galley";
import { answerAboutDocument } from "./actions";
import type { Exchange, QuestionState } from "./question-state";

/**
 * It takes `ExtractedDocument`, the one arm of `ExtractionResult` that carries text, for
 * the same reason `KeepInLibrary` does: a document that could not be read has no `text`
 * field to hand over, so it cannot be asked about and the compiler says so. Only the three
 * fields the server needs go over the wire.
 */
export function QuestionBox({ document }: { document: ExtractedDocument }) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const asked = useRef(0);
  const fieldId = useId();

  async function ask() {
    const text = question.trim();
    if (text === "") return;

    asked.current += 1;
    const id = `query-${asked.current}`;
    // Newest first. A Signer who has asked four things is looking at the one they just
    // sent, not scrolling past it to find the bottom of the list.
    setExchanges((current) => [{ id, question: text, state: { status: "asking" } }, ...current]);
    setQuestion("");

    const state = await answerAboutDocument(
      { name: document.name, format: document.format, text: document.text },
      text
    );
    setExchanges((current) =>
      current.map((exchange) => (exchange.id === id ? { ...exchange, state } : exchange))
    );
  }

  return (
    <section aria-labelledby="ask-about-it" className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
        <h2 id="ask-about-it" className={LABEL}>
          Ask about this contract
        </h2>
        <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          {queryLegend(exchanges)}
        </span>
      </div>

      <p className="mt-5 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft">
        Ask anything else about it. Redline answers from this contract alone and shows you
        the sentence it read the answer out of. Where the wording settles nothing, it says
        so rather than telling you what other contracts do.
      </p>

      <form
        className="mt-6 max-w-[58ch]"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Your question about this contract
        </label>
        <textarea
          id={fieldId}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="What happens if they end it early?"
          className="block w-full border border-rule bg-transparent p-3 font-document text-[1rem] leading-[1.6] text-ink placeholder:text-ink-soft"
        />
        <button type="submit" className={`${STAMP} mt-4`} disabled={question.trim() === ""}>
          Ask
        </button>
      </form>

      {/* What happened, for anyone not watching the list grow. */}
      <p role="status" aria-live="polite" className="sr-only">
        {liveQuery(exchanges[0])}
      </p>

      {exchanges.length > 0 && (
        <ol className="mt-10 border-t border-rule">
          {exchanges.map((exchange) => (
            <li key={exchange.id}>
              <Query exchange={exchange} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * One query and its reply, laid out as a galley.
 *
 * The margin carries the proof mark and one line saying where the query stands: which
 * clause the answer came out of, or that it is unresolved. The clause number is the
 * document's own, read off the quoted sentence (`lib/text/marking.ts`), so it points at
 * something a Signer can find in their copy rather than at a position in this list.
 */
function Query({ exchange }: { exchange: Exchange }) {
  const { state } = exchange;
  const answered = state.status === "answered" && state.answer.answered ? state.answer : null;
  const reference = answered === null ? null : clauseReferenceIn(answered.sourceSentence);

  return (
    <div className="grid max-w-[64rem] gap-x-10 gap-y-4 border-b border-rule py-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="max-w-[58ch]">
        <h3 className="text-[1rem] font-semibold leading-snug text-ink">
          {exchange.question}
        </h3>

        {state.status === "asking" && (
          <p className="mt-3 text-[1.05rem] leading-[1.5] text-ink-soft">
            Redline is reading the contract for an answer.
          </p>
        )}

        {state.status === "answered" && (
          <>
            <p className="mt-3 text-[1.05rem] leading-[1.5] text-ink">{state.answer.text}</p>
            {state.answer.answered && (
              <div className="mt-5 border-t border-rule pt-4">
                <h4 className={LABEL}>The wording it came from</h4>
                {/* The document's words, in the document's face. Search your own copy
                    for this string and you will find it (`docs/adr/0001`). */}
                <p className="mt-2 font-document text-[1.06rem] leading-[1.62] text-ink">
                  {state.answer.sourceSentence}
                </p>
              </div>
            )}
          </>
        )}

        {(state.status === "model-not-set-up" ||
          state.status === "nothing-to-read" ||
          state.status === "no-question" ||
          state.status === "failed") && (
          <p role="alert" className="mt-3 text-[1.05rem] leading-[1.5] text-mark-deep">
            {wentWrong(state)}
          </p>
        )}
      </div>

      <div className="lg:border-l lg:border-rule lg:pl-8">
        <span className="flex items-start gap-3 text-mark">
          <ProofMark kind="query" className="h-6 w-6" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-mark-deep">
            {marginLine(state, reference)}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Where this query stands, said in the margin in four words or so. */
function marginLine(state: QuestionState, reference: string | null): string {
  switch (state.status) {
    case "asking":
      return "Reading";
    case "answered":
      if (!state.answer.answered) return "Unresolved";
      return reference === null ? "Answered" : `Answered at ${reference}`;
    default:
      return "Not asked";
  }
}

function wentWrong(state: QuestionState): string {
  switch (state.status) {
    case "model-not-set-up":
      return "Redline has no model to call on this deployment, so it cannot answer questions here.";
    case "nothing-to-read":
      return "The wording did not make it over, so there was nothing here to read.";
    case "no-question":
      return "Nothing came through with that one. Type the question again.";
    case "failed":
      return state.message;
    default:
      return "";
  }
}

/** How many queries are on the sheet, and how many the contract left unresolved. */
function queryLegend(exchanges: readonly Exchange[]): string {
  if (exchanges.length === 0) return "No queries yet";

  const unresolved = exchanges.filter(
    (exchange) => exchange.state.status === "answered" && !exchange.state.answer.answered
  ).length;
  const asked = exchanges.length === 1 ? "1 query" : `${exchanges.length} queries`;
  return unresolved === 0 ? asked : `${asked} · ${unresolved} unresolved`;
}

function liveQuery(latest: Exchange | undefined): string {
  if (latest === undefined) return "";
  switch (latest.state.status) {
    case "asking":
      return `Reading the contract for an answer to: ${latest.question}`;
    case "answered":
      return latest.state.answer.answered
        ? `Answered from the contract. ${latest.state.answer.text}`
        : `Unresolved. ${latest.state.answer.text}`;
    default:
      return `That question was not answered. ${wentWrong(latest.state)}`;
  }
}
