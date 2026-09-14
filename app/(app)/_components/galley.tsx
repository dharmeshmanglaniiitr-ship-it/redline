/**
 * The pieces of the proof galley that every working view shares.
 *
 * These follow `DESIGN.md` rather than reinventing it: zero radius, no shadow, no
 * cards, hairline rules for lists, 2px ink rules for the masthead and the galley foot,
 * and the stamp's 3px keyline. The landing page built them first; they live here so the
 * working views behind sign-in do not each grow their own version.
 */

import type { ReactNode } from "react";

export type MarkKind = "caret" | "strike" | "query" | "check";

/**
 * A proof mark, drawn rather than set in a font. One 2px stroke, round caps, current
 * colour, hidden from screen readers because the text beside it already says it.
 *
 * Three of them are corrections and are drawn in vermilion. The check is not: it is the
 * blue pencil's only glyph, for a checklist entry that came back with nothing
 * (`DESIGN.md`, The One Correcting Hand Rule). The two hands never borrow each other's
 * job, so a check in vermilion or a caret in blue pencil is a bug.
 */
export function ProofMark({
  kind,
  className = "h-6 w-6",
}: {
  kind: MarkKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "caret" && <path d="M3 17 12 7l9 10" />}
      {kind === "strike" && (
        <>
          <path d="M4 12h16" />
          <path d="M20 8v8" />
        </>
      )}
      {kind === "query" && (
        <>
          <path d="M8.4 9.2a3.6 3.6 0 1 1 3.6 3.6V15" />
          <path d="M12 18.4h.01" />
        </>
      )}
      {kind === "check" && <path d="M4 12.8 9.4 18.2 20 5.8" />}
    </svg>
  );
}

/**
 * Severity, on all three of its channels at once.
 *
 * Filled steps out of four, the severity word, and a visually hidden "severity, N of 4".
 * `DESIGN.md`'s Never-By-Colour Rule requires all three to ship together: this is a
 * WCAG 2.2 AA obligation rather than a style, and a severity display that survives both
 * grayscale printing and screen-reader-only reading is the floor. Colour is the fourth,
 * redundant channel. Removing any one of these breaks the commitment.
 */
export function SeverityMeter({ steps, word }: { steps: number; word: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`block h-3 w-[5px] border border-mark ${
              step <= steps ? "bg-mark" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mark-deep">
        {word}
        <span className="sr-only"> severity, {steps} of 4</span>
      </span>
    </span>
  );
}

/** The sheet's edges. Without them the proof stock reads as a page background. */
export function TrimMarks() {
  const corner = "pointer-events-none absolute h-5 w-5 border-rule";
  return (
    <div aria-hidden="true">
      <span className={`${corner} left-3 top-3 border-l border-t`} />
      <span className={`${corner} right-3 top-3 border-r border-t`} />
      <span className={`${corner} bottom-3 left-3 border-b border-l`} />
      <span className={`${corner} bottom-3 right-3 border-b border-r`} />
    </div>
  );
}

/**
 * The primary action, set as an inked stamp. On proof stock the keyline is stamped
 * vermilion; hover and keyboard focus both invert the fill, so the state never rests on
 * colour alone.
 */
export const STAMP =
  "inline-block cursor-pointer border-[3px] border-mark-deep bg-mark-deep px-7 py-3 " +
  "text-[0.82rem] font-bold uppercase tracking-[0.18em] text-stock transition-colors " +
  "duration-200 hover:bg-transparent hover:text-mark-deep focus-visible:bg-transparent " +
  "focus-visible:text-mark-deep disabled:cursor-not-allowed disabled:border-rule " +
  "disabled:bg-transparent disabled:text-ink-soft";

/** A label in the register of a printer's production legend. */
export const LABEL =
  "text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft";

/**
 * Where Redline stops, in one sentence, kept in one place so every screen says it the
 * same way.
 *
 * `PRODUCT.md` draws the line and the whole product sits inside it: an explanation of a
 * document and wording to send, with the decision left where it belongs. It is said at
 * the foot of every working view, and again on the review sheet next to the report
 * itself, because a limit a Signer only meets after scrolling past the answer is a limit
 * they read too late.
 */
export const WHERE_REDLINE_STOPS =
  "Redline explains a document and drafts wording you can send. It does not tell you " +
  "whether to sign, and it is not a law firm.";

/**
 * The legend row that opens the sheet: what the document is on the left, what state it
 * is in on the right. It is the first thing on the page, with no chrome above it.
 *
 * `law` is the third thing a sheet can declare, and it sits between them because it is
 * the middle claim: which law the reading was made under (`docs/adr/0007`). It is
 * omitted only where there is no reading to declare it for, never to hide that the law is
 * unknown, which is a state the legend says out loud. It takes a node rather than a
 * string so the declaration can carry a link to the place the law is corrected, which is
 * what `docs/adr/0007` asks the masthead for.
 */
export function Masthead({
  document,
  law,
  state,
  alarmed = false,
}: {
  document: string;
  /** The law the analysis read under, already written for this register. */
  law?: ReactNode;
  state: string;
  /** Draws the state in the correcting hand, for a document that could not be read. */
  alarmed?: boolean;
}) {
  return (
    <div className="numeric flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink">
      <span>{document}</span>
      {law !== undefined && <span className="text-ink-soft">{law}</span>}
      <span className={alarmed ? "flex items-center gap-2 text-mark-deep" : "text-ink-soft"}>
        {alarmed && <ProofMark kind="strike" className="h-4 w-4" />}
        {state}
      </span>
    </div>
  );
}

/** The legend row that closes the sheet. */
export function GalleyFoot({ parts }: { parts: readonly string[] }) {
  return (
    <div className="numeric mt-16 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t-2 border-ink pt-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
      {parts.map((part, index) => (
        <span key={part} className={index === 0 ? "text-ink" : undefined}>
          {part}
        </span>
      ))}
    </div>
  );
}
