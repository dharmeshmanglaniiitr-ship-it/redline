/**
 * The invariants the spec names, as assertions.
 *
 * `docs/spec-v1.md` (Testing Decisions) rules out asserting on prompt text, model
 * identity, call order or exact output strings, because model output varies between
 * runs and tests coupled to it get deleted rather than maintained. What is left is a
 * short list of things that hold regardless of wording: a quoted sentence appears
 * verbatim in the document, one finding ranks above another, a refusal happened, a
 * checklist entry was reported. Those live here so every test states them the same way.
 *
 * The parameter types are structural on purpose. Nothing here imports an analysis type,
 * so the real results from `analyze()` and `answerQuestion()` satisfy these helpers as
 * soon as they exist, without this file having to guess their shape first.
 */

import { expect } from "vitest";

import { splitIntoSentences } from "@/lib/text/sentences";

/** Anything carrying a severity, so two findings can be ranked against each other. */
export interface Ranked {
  readonly severity: number;
}

/** Anything carrying a citation (`docs/adr/0001`). */
export interface Cited {
  readonly sourceSentence: string;
}

/** Anything carrying `docs/adr/0006`'s hedge and the provenance behind it. */
export interface Hedgeable {
  readonly hedged: boolean;
  readonly unstatedProperties: readonly string[];
}

/** An answer to a document question, which either answers or refuses (user story 20). */
export interface Answered {
  readonly answered: boolean;
}

/**
 * A quoted sentence has to appear in the document character for character (`PRD.md` §4
 * test 1), and it has to be a whole sentence as `splitIntoSentences` defines one — the
 * same split the analysis cites against, so a quote that is really half a sentence or
 * two joined ones fails here rather than passing a bare substring check.
 */
export function expectQuotedVerbatim(documentText: string, quote: string): void {
  expect(documentText).toContain(quote);
  expect(splitIntoSentences(documentText)).toContain(quote);
}

/** One finding is a worse problem than another (`PRD.md` §4 test 2, user story 12). */
export function expectRanksAbove(higher: Ranked, lower: Ranked): void {
  expect(higher.severity).toBeGreaterThan(lower.severity);
}

/** Findings arrive worst-first, so a Signer with ten minutes reads the right ones. */
export function expectRankedWorstFirst(findings: readonly Ranked[]): void {
  const severities = findings.map((finding) => finding.severity);
  expect(severities).toEqual([...severities].sort((a, b) => b - a));
}

/**
 * `hedged === (unstatedProperties.length > 0)`, and a hedge names what is missing
 * (`docs/adr/0006`). Both directions matter: a hedge with nothing missing is a default
 * hedge, and a missing property with no hedge is a finding stated on a basis the
 * document never supplied.
 */
export function expectHedgeMatchesProvenance(finding: Hedgeable): void {
  expect(finding.hedged).toBe(finding.unstatedProperties.length > 0);
}

/** The question was refused rather than answered from general legal knowledge. */
export function expectRefusal(answer: Answered): void {
  expect(answer.answered).toBe(false);
}

/** The document answered, rather than refusing (the other half of the refusal test). */
export function expectAnswered(answer: Answered): void {
  expect(answer.answered).toBe(true);
}

/**
 * A checklist entry was examined and reported clean by name (`docs/adr/0004`). Zero
 * flags with an empty checklist is indistinguishable from not having looked, which is
 * why this is asserted entry by entry rather than on the list's length.
 */
export function expectChecklistReported(reported: readonly string[], entry: string): void {
  expect(reported).toContain(entry);
}
