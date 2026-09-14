/**
 * The pieces of the proof galley that every working view shares.
 *
 * These follow `DESIGN.md` rather than reinventing it: zero radius, no shadow, no
 * cards, hairline rules for lists, 2px ink rules for the masthead and the galley foot,
 * and the stamp's 3px keyline. The landing page built them first; they live here so the
 * working views behind sign-in do not each grow their own version.
 */

export type MarkKind = "caret" | "strike" | "query";

/**
 * A proof mark, drawn rather than set in a font. One 2px stroke, round caps, current
 * colour, hidden from screen readers because the text beside it already says it.
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
 * The legend row that opens the sheet: what the document is on the left, what state it
 * is in on the right. It is the first thing on the page, with no chrome above it.
 */
export function Masthead({
  document,
  state,
  alarmed = false,
}: {
  document: string;
  state: string;
  /** Draws the state in the correcting hand, for a document that could not be read. */
  alarmed?: boolean;
}) {
  return (
    <div className="numeric flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink">
      <span>{document}</span>
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
