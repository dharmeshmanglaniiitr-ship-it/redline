"use client";

/**
 * The marked proof: the contract with its risky clauses marked in the line and in the
 * margin, and a ranked index over the top of it.
 *
 * This is `DESIGN.md`'s signature structure and its signature components, so the shape
 * is not a local choice. A finding is a mark in the line *and* a mark in the margin,
 * carrying the same glyph, read together — the Paired Mark Rule — because that is what
 * proof notation is and because it is literally what the product does: point at a
 * sentence. Severity ships on three channels at once. The leader rule that ties a margin
 * mark to its sentence is drawn at 1024px and above and nowhere else, because below that
 * the two columns are stacked and there is no gutter for a leader to cross.
 *
 * Everything a reader sees here comes out of the analysis. The sentences are the
 * document's own text, cut at the boundaries the citations gave (`lib/text/marking.ts`),
 * so a marked sentence on this screen is the same string the Signer will find when they
 * search their own copy. Nothing is re-typed, summarised or re-flowed on the way.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ClauseType } from "@/lib/analysis/clauses";
import type { CounterOffer, RiskFlag } from "@/lib/analysis/result";
import { severityWord } from "@/lib/analysis/wording";
import { clauseReferenceIn, markUpDocument } from "@/lib/text/marking";

import { LABEL, ProofMark, SeverityMeter, type MarkKind } from "../_components/galley";
import { CROSSED_HEADING, crossedLegend } from "./red-lines";

/**
 * Which proof mark each kind of finding carries.
 *
 * A strike is a deletion, for the clauses a Signer most often needs struck out rather
 * than narrowed: payment left to the client's satisfaction, and a power to rewrite the
 * terms after signing. A caret is an insertion, for the clauses that are fixed by
 * putting a bound into them — where the assignment stops, how far the restriction
 * reaches, what sets an indemnity off, what the ceiling on liability is. A query is the
 * mark for something to take up, which is what an early exit with nothing payable and a
 * term that renews itself both are. The same glyph appears on both halves of the pair;
 * that is what makes them one mark.
 */
const MARK_OF: Record<ClauseType, MarkKind> = {
  "payment-approval": "strike",
  "ip-assignment": "caret",
  "non-compete": "caret",
  "termination-for-convenience": "query",
  "one-sided-indemnity": "caret",
  "uncapped-liability": "caret",
  "auto-renewal": "query",
  "unilateral-change": "strike",
};

interface Leader {
  readonly points: string;
  readonly width: number;
  readonly height: number;
}

export function MarkedGalley({
  documentText,
  flags,
}: {
  documentText: string;
  /** Worst first, as `analyze()` ranked them. The order here is the order shown. */
  flags: readonly RiskFlag[];
}) {
  const [chosen, setChosen] = useState(flags[0]?.id ?? "");
  const galleyRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sentenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [leader, setLeader] = useState<Leader | null>(null);

  const blocks = useMemo(() => markUpDocument(documentText, flags), [documentText, flags]);
  const byId = useMemo(
    () => new Map(flags.map((flag) => [flag.id, flag] as const)),
    [flags]
  );

  // Reading a second document leaves the first document's choice behind. Falling back to
  // the worst finding keeps a mark open on arrival rather than opening the new contract
  // with every margin card shut and a selection pointing at a clause that is gone.
  const selected = byId.has(chosen) ? chosen : (flags[0]?.id ?? "");

  /**
   * Where the leader rule runs, or null when it must not be drawn.
   *
   * Null below 1024px is the Desktop Leader Rule, not a gap: the columns are stacked
   * there, so any drawn path would cross body text. The in-line mark carries the tie
   * instead, and the margin card sits directly under its own clause.
   */
  const measure = useCallback(() => {
    const galley = galleyRef.current;
    const mark = markRefs.current[selected];
    const sentence = sentenceRefs.current[selected];
    if (!galley || !mark || !sentence) return setLeader(null);
    if (!window.matchMedia("(min-width: 1024px)").matches) return setLeader(null);

    const frame = galley.getBoundingClientRect();
    const from = mark.getBoundingClientRect();
    const rects = sentence.getClientRects();
    const head = rects[0];
    if (!head) return setLeader(null);

    // A proof mark ties to a line. A wrapped sentence's first rect ends at the wrap
    // point with nothing after it, so the leader can land there; a single-line sentence
    // would have the leader cross whatever follows it, so it stops at the column edge.
    const column = sentence.closest("p")?.getBoundingClientRect();
    const anchor = rects.length > 1 ? head.right : (column?.right ?? head.right);
    const x1 = from.left - frame.left - 12;
    const y1 = from.top - frame.top + 17;
    const x2 = anchor - frame.left + 7;
    const y2 = head.top - frame.top + head.height / 2;
    const elbow = x2 + (x1 - x2) * 0.45;

    setLeader({
      points: `${x1},${y1} ${elbow},${y1} ${elbow},${y2} ${x2},${y2}`,
      width: frame.width,
      height: frame.height,
    });
  }, [selected]);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    if (galleyRef.current) observer.observe(galleyRef.current);
    document.fonts?.ready.then(onResize).catch(() => {});
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [measure]);

  function choose(id: string, scroll = false) {
    setChosen(id);
    if (scroll) {
      sentenceRefs.current[id]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  return (
    <div ref={galleyRef} className="relative mt-8">
      {leader && (
        <svg
          className="pointer-events-none absolute inset-0 hidden lg:block"
          width={leader.width}
          height={leader.height}
          viewBox={`0 0 ${leader.width} ${leader.height}`}
          aria-hidden="true"
        >
          <polyline
            key={selected}
            className="leader"
            points={leader.points}
            fill="none"
            stroke="var(--mark)"
            strokeWidth={1.5}
            strokeLinecap="square"
            pathLength={1}
          />
        </svg>
      )}

      <nav aria-labelledby="worst-first" className="max-w-[24rem]">
        {/* The heading says how the list is actually ordered. A Signer whose own lines
            moved something to the top is owed that in one line, rather than being left to
            work out why a mark reading "noted" is above one reading "highest"
            (`docs/adr/0009`). */}
        <h3 id="worst-first" className={LABEL}>
          {flags.some((flag) => flag.redLinesCrossed.length > 0)
            ? "Your lines first, then worst first"
            : "Worst first"}
        </h3>
        <ol className="mt-3 border-t border-rule">
          {flags.map((flag, index) => {
            const active = selected === flag.id;
            const reference = clauseReferenceIn(flag.sourceSentence);
            return (
              <li key={flag.id} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => choose(flag.id, true)}
                  aria-pressed={active}
                  className="flex w-full cursor-pointer items-start gap-3 py-2.5 text-left transition-colors duration-200 hover:bg-stock-shade"
                >
                  <span
                    className={`numeric mt-px w-3 shrink-0 text-[0.78rem] font-bold ${
                      active ? "text-mark-deep" : "text-ink-soft"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    <span
                      className={`block text-[0.92rem] font-semibold leading-snug ${
                        active
                          ? "text-ink underline decoration-mark decoration-2 underline-offset-4"
                          : "text-ink-soft"
                      }`}
                    >
                      {flag.title}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <SeverityMeter
                        steps={flag.severity}
                        word={severityWord(flag.severity)}
                      />
                      {reference && (
                        <span className="numeric font-document text-[0.82rem] text-ink-soft">
                          Clause {reference}
                        </span>
                      )}
                      {/* Why this row is where it is. Kept off the meter, because the meter
                          says what the wording costs anybody and this says what the Signer
                          told Redline about it (`docs/adr/0009`). */}
                      {flag.redLinesCrossed.length > 0 && (
                        <span className="border border-mark-deep px-1.5 py-px text-[0.62rem] font-bold uppercase tracking-[0.14em] text-mark-deep">
                          {crossedLegend(flag.redLinesCrossed.length)}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-9 space-y-9">
        {blocks.map((block, index) => {
          const flag = block.flagIds
            .map((id) => byId.get(id))
            .find((found): found is RiskFlag => found !== undefined);
          const active = flag !== undefined && flag.id === selected;

          return (
            <div
              key={index}
              className={`grid max-w-[64rem] gap-x-10 gap-y-4 transition-opacity duration-500 lg:grid-cols-[minmax(0,1fr)_18rem] ${
                active ? "opacity-100" : "opacity-[0.82]"
              }`}
            >
              <p className="max-w-[58ch] whitespace-pre-line font-document text-[1.06rem] leading-[1.62] text-ink">
                {block.spans.map((span, spanIndex) => {
                  const marked = span.flagId === null ? undefined : byId.get(span.flagId);
                  if (marked === undefined) {
                    return <span key={spanIndex}>{span.text}</span>;
                  }
                  const kind = MARK_OF[marked.clauseType];
                  const chosen = marked.id === selected;
                  return (
                    <span key={spanIndex}>
                      {/* The in-line half of the pair. Same glyph as the margin. */}
                      <ProofMark
                        kind={kind}
                        className="mr-0.5 inline h-[0.95em] w-[0.95em] -translate-y-[0.1em] align-middle text-mark"
                      />
                      <span
                        id={`sentence-${marked.id}`}
                        ref={(element) => {
                          sentenceRefs.current[marked.id] = element;
                        }}
                        className={`decoration-mark decoration-[1.5px] underline-offset-[5px] ${
                          kind === "strike"
                            ? "line-through"
                            : chosen
                              ? "underline"
                              : "underline decoration-dotted"
                        } ${chosen ? "bg-stock-shade" : ""}`}
                      >
                        {span.text}
                      </span>
                    </span>
                  );
                })}
              </p>

              {flag && (
                <div className="lg:border-l lg:border-rule lg:pl-8">
                  <MarginMark
                    flag={flag}
                    active={active}
                    onChoose={() => choose(flag.id)}
                    register={(element) => {
                      markRefs.current[flag.id] = element;
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The margin half of the pair.
 *
 * A button rather than a link or a div, carrying `aria-pressed` for its state and
 * `aria-controls` pointing at the sentence it marks, so the tie between the two halves
 * is in the markup and not only in the drawn leader. Opening it shows what the clause
 * would cost, at 40ch, the hedge under that where the contract left something out, and
 * the wording to send back under that again.
 *
 * The counter-offer is last and it opens with the cost, because the order is the order a
 * Signer decides in: what this clause would do to me, what Redline could not tell from
 * the text, and then what to say about it. Putting the redraft first would be handing
 * them a reply to send before they had read why.
 */
function MarginMark({
  flag,
  active,
  onChoose,
  register,
}: {
  flag: RiskFlag;
  active: boolean;
  onChoose: () => void;
  register: (element: HTMLButtonElement | null) => void;
}) {
  const reference = clauseReferenceIn(flag.sourceSentence);

  return (
    <>
      <button
        type="button"
        ref={register}
        onClick={onChoose}
        aria-pressed={active}
        aria-controls={`sentence-${flag.id}`}
        className="w-full cursor-pointer text-left transition-colors duration-200 hover:bg-stock-shade"
      >
        <span className="flex items-start gap-3 text-mark">
          <ProofMark kind={MARK_OF[flag.clauseType]} />
          <span className="flex-1">
            <span className="block text-[1rem] font-semibold leading-snug text-ink">
              {flag.title}
            </span>
            <span className="mt-2 block">
              <SeverityMeter steps={flag.severity} word={severityWord(flag.severity)} />
            </span>
          </span>
        </span>
        <span className="sr-only">
          {active ? "Showing" : "Show"} the sentence
          {reference ? ` in clause ${reference}` : ""} this came from
        </span>
      </button>

      {active && (
        <>
          <p className="mt-4 max-w-[40ch] text-[0.94rem] leading-[1.55] text-ink-soft">
            {flag.cost}
          </p>
          {/* A hedge names the property the contract left out (`docs/adr/0006`). It sits
              under the cost rather than beside the meter, because it says what the mark
              was worked out from — it does not lower the mark. */}
          {flag.hedgeNote && (
            <p className="mt-3 flex max-w-[40ch] items-start gap-2 border-t border-rule pt-3 text-[0.88rem] leading-[1.5] text-ink-soft">
              <ProofMark kind="query" className="mt-0.5 h-4 w-4 text-mark" />
              <span>{flag.hedgeNote}</span>
            </p>
          )}
          {/* The Signer's own standard, quoted back at them in their own words. It sits
              under the cost and the hedge because it answers a different question: not
              what this clause does, but why it is the one they are looking at
              (`docs/adr/0009`). */}
          {flag.redLinesCrossed.length > 0 && (
            <div className="mt-3 max-w-[40ch] border-t border-rule pt-3">
              <h4 className={LABEL}>{CROSSED_HEADING}</h4>
              <ul className="mt-2 space-y-3">
                {flag.redLinesCrossed.map((crossing) => (
                  <li key={crossing.redLine}>
                    <p className="border-l-2 border-mark pl-3 font-document text-[0.94rem] leading-[1.5] text-ink">
                      {crossing.redLine}
                    </p>
                    <p className="mt-1.5 pl-3 text-[0.86rem] leading-[1.5] text-ink-soft">
                      {crossing.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {flag.counterOffer && <DraftedReply offer={flag.counterOffer} />}
        </>
      )}
    </>
  );
}

/**
 * The wording to send back, set in two voices.
 *
 * The clause as it stands and the clause as it would read are the document's words, so
 * they are set in the document's face; everything around them is the Signer's own note
 * and is set in the product's. That is `DESIGN.md`'s Two Voices Rule applied to a block
 * that genuinely contains both, and it is not only typographic — it is what lets a
 * Signer see at a glance which part of this goes into the contract and which part is the
 * covering line.
 *
 * The message is rendered whole rather than in pieces, with the blank lines it was
 * written with, because the whole of it is what gets pasted into a reply.
 *
 * One line says what the block is before the block is read. Of everything on this screen
 * the drafted reply is the piece that most resembles something a lawyer hands over, and a
 * Signer about to send it under their own name is owed the difference in the margin where
 * they are looking rather than in the footer under the sheet.
 */
function DraftedReply({ offer }: { offer: CounterOffer }) {
  const parts = useMemo(
    () => inTwoVoices(offer.text, [offer.replacement, offer.replaces]),
    [offer]
  );

  return (
    <div className="mt-3 max-w-[40ch] border-t border-rule pt-3">
      <h4 className={LABEL}>What to send back</h4>
      <p className="mt-2 text-[0.82rem] leading-[1.5] text-ink-soft">
        {DRAFTED_NOT_ADVISED}
      </p>
      <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-[1.55] text-ink-soft">
        {parts.map((part, index) =>
          part.quoted ? (
            <span key={index} className="font-document text-ink">
              {part.text}
            </span>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </p>
    </div>
  );
}

/**
 * What the drafted reply is, said above it.
 *
 * Exported so the tests read the same sentence the margin does. It says the two things a
 * Signer needs before pasting this into an email: it is wording to ask with, and asking is
 * a different act from having been told whether to sign.
 */
export const DRAFTED_NOT_ADVISED =
  "Wording to ask with, if you want to ask. Redline drafts it from what the clause says. " +
  "Whether to sign is yours.";

/** One run of the drafted message, and whether it is clause text or the note around it. */
interface Voiced {
  readonly text: string;
  readonly quoted: boolean;
}

/**
 * Cut the message at the clause text inside it.
 *
 * Longest first, because a counter-offer that keeps the clause and adds a line to it has
 * the old sentence sitting inside the new one — split on the short one first and the
 * long one is no longer there to find.
 */
function inTwoVoices(text: string, quotes: readonly string[]): Voiced[] {
  let parts: Voiced[] = [{ text, quoted: false }];

  for (const quote of [...quotes].sort((a, b) => b.length - a.length)) {
    if (quote === "") continue;
    const next: Voiced[] = [];
    for (const part of parts) {
      if (part.quoted) {
        next.push(part);
        continue;
      }
      part.text.split(quote).forEach((piece, index) => {
        if (index > 0) next.push({ text: quote, quoted: true });
        if (piece !== "") next.push({ text: piece, quoted: false });
      });
    }
    parts = next;
  }

  return parts;
}
