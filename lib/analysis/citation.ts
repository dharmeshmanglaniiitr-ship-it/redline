/**
 * Checking that a quoted sentence is really in the document.
 *
 * `docs/adr/0001` says a flag has to quote the exact sentence it came from. This is the
 * part that makes that true rather than asked for: every citation is matched against the
 * parsed document before the flag reaches a screen, and a flag whose quote does not
 * match is dropped. Not shown with a caveat, not shown with a nearby sentence instead —
 * dropped. A caveat would leave the Signer holding a claim they cannot check, which is
 * the exact thing the citation rule exists to prevent.
 *
 * Paraphrase fails. Reformatting fails. Two sentences joined into one quote fails, and
 * so does half of one. All of those can be materially accurate and still fail, which is
 * the point: the check is on the characters, because the Signer's next move is to search
 * their own copy for the quoted string and find it.
 *
 * Two things are deliberately allowed through, and neither lets a character differ.
 * Whitespace around the whole quote is trimmed, because `splitIntoSentences` hands back
 * trimmed sentences and a trailing newline is not a misquotation. And the quote has to
 * be a whole sentence by that same splitter, not merely a substring, so a bare fragment
 * that happens to appear inside a longer sentence does not pass as a citation.
 */

import { splitIntoSentences } from "@/lib/text/sentences";

/** Anything carrying a citation, which is every flag (`lib/analysis/result.ts`). */
export interface Cited {
  readonly sourceSentence: string;
}

/**
 * A verifier bound to one document.
 *
 * The document is split once and kept, because the same text is checked against every
 * flag and splitting it per flag is the same answer computed repeatedly.
 */
export interface CitationVerifier {
  /** Whether this quote is a sentence of the document, character for character. */
  verifies(quote: string): boolean;
  /** The same quote, trimmed, when it verifies; null when it does not. */
  verified(quote: string): string | null;
}

/** Build a verifier over one document's parsed text. */
export function createCitationVerifier(documentText: string): CitationVerifier {
  const sentences = new Set(splitIntoSentences(documentText));

  const verified = (quote: string): string | null => {
    const trimmed = quote.trim();
    if (trimmed === "") return null;
    // Both halves matter. Containment is what a Signer will do with their own search
    // box; sentence membership is what stops a fragment or a pair of joined sentences
    // passing as a quotation of one.
    if (!documentText.includes(trimmed)) return null;
    return sentences.has(trimmed) ? trimmed : null;
  };

  return {
    verifies: (quote) => verified(quote) !== null,
    verified,
  };
}

/**
 * Whether one quote is a verbatim sentence of one document.
 *
 * The single-shot form, for a caller with one quote to check. A caller with several
 * should build a `CitationVerifier` instead and reuse it.
 */
export function citationVerifies(documentText: string, quote: string): boolean {
  return createCitationVerifier(documentText).verifies(quote);
}

/**
 * Keep only the findings whose citation the document bears out, with each one's quote
 * replaced by the verified text.
 *
 * Dropping is the whole behaviour. Nothing is repaired, nothing is matched
 * approximately, and nothing comes back carrying a note that its source could not be
 * found — a flag Redline cannot show the source of is not a flag (`docs/adr/0001`).
 */
export function keepVerifiedCitations<T extends Cited>(
  documentText: string,
  findings: readonly T[]
): T[] {
  const verifier = createCitationVerifier(documentText);
  const kept: T[] = [];
  for (const finding of findings) {
    const sourceSentence = verifier.verified(finding.sourceSentence);
    if (sourceSentence === null) continue;
    kept.push({ ...finding, sourceSentence });
  }
  return kept;
}
