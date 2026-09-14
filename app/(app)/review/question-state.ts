/**
 * What asking a question about a document can come back as.
 *
 * Apart from `actions.ts` because a `"use server"` module may only export functions, and
 * the client half needs the type. It sits beside `analysis-state.ts` and reads the same
 * way, for the same reason: a deployment with no model access, a question that never
 * arrived and a call that did not come back are three different things, and a Signer is
 * told which happened rather than being left looking at their own question with nothing
 * under it.
 *
 * The answered arm carries a `DocumentAnswer`, so the refusal stays a refusal all the way
 * to the screen. There is no "refused" status here and there must not be one: whether the
 * document answered is the seam's verdict (`lib/analysis/answer.ts`), and a second place
 * that could say so is a second place that could disagree.
 */

import type { DocumentAnswer } from "@/lib/analysis/answer";

export type QuestionState =
  | { readonly status: "asking" }
  | { readonly status: "answered"; readonly answer: DocumentAnswer }
  /** Nothing was typed, so nothing was asked. */
  | { readonly status: "no-question" }
  /** No `OPENROUTER_API_KEY` or no `OPENROUTER_MODEL` on this deployment. */
  | { readonly status: "model-not-set-up" }
  /** The text that came over does not hold a contract, so nothing was read. */
  | { readonly status: "nothing-to-read" }
  | { readonly status: "failed"; readonly message: string };

/** One question a Signer asked, and where the reply to it has got to. */
export interface Exchange {
  /** Stable within this session, so React can key the list and focus can follow it. */
  readonly id: string;
  readonly question: string;
  readonly state: QuestionState;
}
