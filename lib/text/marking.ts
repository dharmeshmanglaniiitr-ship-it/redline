/**
 * Laying a set of flags over the document text they were taken from.
 *
 * `DESIGN.md`'s Paired Mark Rule says a finding is a mark in the line *and* a mark in
 * the margin, carrying the same glyph, read together — one without the other is a broken
 * version of this system rather than a lighter one. The margin half is easy: a flag is
 * already an object with a title and a meter on it. The in-line half needs the document
 * cut at the exact boundaries of each cited sentence, so the sentence can be underlined
 * where it sits, with the rest of the clause around it untouched.
 *
 * Cutting it here rather than in the component keeps the arithmetic testable and keeps
 * one rule enforceable: the pieces reassemble into the original text exactly. Rendering
 * a contract is quoting it, and a document that came back through this function with a
 * space moved would be a misquotation on the same screen that promises none.
 *
 * A citation that is not in the text produces no mark at all. That cannot happen for a
 * flag — `lib/analysis/citation.ts` has already dropped any flag whose quote the
 * document does not contain — but it is the safe behaviour if it ever did: an unmarked
 * sentence, never a mark on the wrong one.
 */

/** One run of document text, either an ordinary stretch or a flag's own sentence. */
export interface MarkedSpan {
  readonly text: string;
  /** The flag this run is the citation of, or null for text no flag pointed at. */
  readonly flagId: string | null;
}

/** One paragraph-sized block of the document, as the sheet sets it. */
export interface MarkedBlock {
  readonly spans: readonly MarkedSpan[];
  /** The flags marked inside this block, in the order their sentences appear. */
  readonly flagIds: readonly string[];
}

/** What `markUpDocument` needs from a flag: which one it is, and what it quotes. */
export interface Citation {
  readonly id: string;
  readonly sourceSentence: string;
}

/**
 * Cut the document into blocks and mark each cited sentence inside them.
 *
 * Blocks are separated by blank lines, which is how contracts are set and how the sheet
 * already renders them. A citation is marked at its first occurrence and only there: a
 * sentence that appears twice in a contract gets one mark, because the flag came from
 * one clause and pointing at both would be pointing at a clause nobody read.
 *
 * @param documentText the parsed document, exactly as the analysis was given it
 * @param citations the flags to lay over it, in whatever order they will be listed
 */
export function markUpDocument(
  documentText: string,
  citations: readonly Citation[]
): MarkedBlock[] {
  const unplaced = citations.filter((citation) => citation.sourceSentence !== "");
  const placed = new Set<string>();

  return splitIntoBlocks(documentText).map((block) => {
    const marks: { start: number; end: number; id: string }[] = [];

    for (const citation of unplaced) {
      if (placed.has(citation.id)) continue;
      const start = block.indexOf(citation.sourceSentence);
      if (start < 0) continue;
      marks.push({ start, end: start + citation.sourceSentence.length, id: citation.id });
      placed.add(citation.id);
    }

    marks.sort((a, b) => a.start - b.start);

    const spans: MarkedSpan[] = [];
    const flagIds: string[] = [];
    let at = 0;
    for (const mark of marks) {
      // One sentence cannot sit inside another, so an overlap means two citations
      // quoting the same run of text. The first one keeps it.
      if (mark.start < at) continue;
      if (mark.start > at) spans.push({ text: block.slice(at, mark.start), flagId: null });
      spans.push({ text: block.slice(mark.start, mark.end), flagId: mark.id });
      flagIds.push(mark.id);
      at = mark.end;
    }
    if (at < block.length) spans.push({ text: block.slice(at), flagId: null });

    return { spans, flagIds };
  });
}

/**
 * The clause number a sentence opens with — "9.1", "4.2", "12" — or null.
 *
 * The margin mark says which clause it is pointing at, and the index sets the same
 * string in the document's own face, because a clause reference belongs to the contract
 * and not to Redline (`DESIGN.md`, The Two Voices Rule). Contracts that number their
 * clauses are the ordinary case; one that does not gets no reference rather than an
 * invented one.
 */
export function clauseReferenceIn(sentence: string): string | null {
  const opening = /^\(?(\d+(?:\.\d+)*)[).]?\s/.exec(sentence.trim());
  return opening === null ? null : opening[1];
}

/**
 * Split on blank lines, keeping every other character.
 *
 * The separators are dropped and the blocks are not trimmed, so joining the result with
 * a blank line gives back text that differs from the original only in how many blank
 * lines sat between blocks — which is layout, not wording.
 */
function splitIntoBlocks(documentText: string): string[] {
  return documentText.split(/\n[ \t]*\n+/).filter((block) => block.trim() !== "");
}
