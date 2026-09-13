/**
 * Sentence splitting for document text.
 *
 * Every risk flag has to quote the exact sentence it came from (ADR 0001), and those
 * quotes are checked by exact string match against the parsed document before a flag
 * is shown. That only works if "sentence" means one specific thing everywhere, so the
 * split lives here rather than being re-invented at each seam.
 *
 * Sentences come back trimmed of surrounding whitespace and otherwise untouched, so a
 * returned sentence is still a verbatim substring of the document it came from.
 */

/**
 * Words that routinely end in a full stop mid-sentence. Lowercased, without the stop.
 * Contract-flavoured rather than exhaustive: party names ("Acme Ltd."), cross-references
 * ("Sec.", "Art.") and the Latin shorthand drafters reach for.
 */
const ABBREVIATIONS = new Set([
  "approx",
  "art",
  "arts",
  "cf",
  "co",
  "corp",
  "dr",
  "eg",
  "etc",
  "ie",
  "inc",
  "llc",
  "llp",
  "ltd",
  "mr",
  "mrs",
  "ms",
  "no",
  "nos",
  "para",
  "paras",
  "plc",
  "prof",
  "sec",
  "secs",
  "viz",
  "vs",
]);

const TERMINATORS = new Set([".", "!", "?"]);

/** Quotes and brackets that can sit between the full stop and the gap after it. */
const CLOSERS = new Set([")", "]", "}", '"', "'", "”", "’", "»"]);

/**
 * Split document text into sentences.
 *
 * A sentence ends at `.`, `!` or `?` followed by whitespace or the end of the text, and
 * at a line break. A full stop does not end a sentence when it belongs to a number
 * ("Section 4.2", "1.5%"), to a known abbreviation, to an initial ("J. Smith"), or when
 * the next word starts in lower case — the usual sign the stop was part of a word
 * rather than the end of a thought.
 *
 * @param documentText text extracted from a document
 * @returns each sentence, trimmed, in the order it appears; empty for blank input
 */
export function splitIntoSentences(documentText: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  const push = (end: number): void => {
    const sentence = documentText.slice(start, end).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    start = end;
  };

  for (let i = 0; i < documentText.length; i++) {
    const char = documentText[i];

    if (char === "\n" || char === "\r") {
      push(i);
      continue;
    }

    if (!TERMINATORS.has(char)) {
      continue;
    }

    // Step past any closing quote or bracket riding on the terminator.
    let end = i + 1;
    while (end < documentText.length && CLOSERS.has(documentText[end])) {
      end++;
    }

    const next = documentText[end];
    const atEnd = next === undefined;
    if (!atEnd && !isWhitespace(next)) {
      continue;
    }

    if (char === "." && !endsSentence(documentText, i, end)) {
      continue;
    }

    push(end);
    i = end - 1;
  }

  push(documentText.length);
  return sentences;
}

/**
 * Decide whether the full stop at `dotIndex` closes a sentence, given the text that
 * precedes it and the text that follows the closers ending at `afterClosers`.
 */
function endsSentence(
  text: string,
  dotIndex: number,
  afterClosers: number
): boolean {
  const before = text.slice(0, dotIndex);

  // "4." or "1.2." opening a line is a clause number, not the end of a sentence.
  // (A stop inside a number, as in "Section 4.2", never reaches here: it is followed
  // by a digit rather than by whitespace.)
  const clauseNumber = /(?:^|\n)[ \t]*\(?\d+(?:\.\d+)*$/.exec(before);
  if (clauseNumber !== null) {
    return false;
  }

  const word = /([A-Za-z.]+)$/.exec(before);
  if (word !== null) {
    const token = word[1];
    // "J. Smith" — a lone capital is an initial, not the end of a sentence.
    if (token.length === 1) {
      return false;
    }
    if (ABBREVIATIONS.has(token.replace(/\./g, "").toLowerCase())) {
      return false;
    }
  }

  // A following lower-case word means the stop sat inside a sentence, not after one.
  const rest = text.slice(afterClosers);
  const nextWord = /\S/.exec(rest);
  if (nextWord !== null && isLowerCaseLetter(nextWord[0])) {
    return false;
  }

  return true;
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isLowerCaseLetter(char: string): boolean {
  return char >= "a" && char <= "z";
}
