/**
 * What asking for an explanation of a document can come back as.
 *
 * Apart from `actions.ts` because a `"use server"` module may only export functions, and
 * the client half needs the type. Every arm is a state the screen draws: a deployment
 * with no model access and a call that did not come back are different things, and a
 * Signer is told which happened rather than being left looking at a document with
 * nothing said about it.
 */

import type { AnalysisResult } from "@/lib/analysis/result";

/** What the browser hands the server: the text it read, and what it read it out of. */
export interface ReadDocument {
  readonly name: string;
  readonly format: string;
  readonly text: string;
}

export type AnalysisState =
  | { readonly status: "not-asked" }
  | { readonly status: "working" }
  | { readonly status: "explained"; readonly result: AnalysisResult }
  /** No `OPENROUTER_API_KEY` or no `OPENROUTER_MODEL` on this deployment. */
  | { readonly status: "model-not-set-up" }
  /** The text that came over does not hold a contract, so nothing was analysed. */
  | { readonly status: "nothing-to-read" }
  | { readonly status: "failed"; readonly message: string };

export const NOT_ASKED: AnalysisState = { status: "not-asked" };
