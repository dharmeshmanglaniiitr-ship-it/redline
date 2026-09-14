/**
 * The Signer's standing standard, as the screen holds it, and the edits it can make.
 *
 * Apart from `actions.ts` because a `"use server"` module may only export functions, and
 * the client half needs the types.
 *
 * Every arm is a state the screen draws. A deployment with no Supabase project and a
 * session that has run out are different things and are said differently, the same way
 * `keep-state.ts` separates them: one is a feature this deployment does not have, the
 * other is something the Signer can fix by signing in again.
 */

/** One recorded line, with the handle the screen changes and removes it by. */
export interface RecordedRedLine {
  readonly id: string;
  /** The Signer's own words, as they wrote them. */
  readonly text: string;
}

export type RedLinesState =
  /** Before the first read comes back. The screen shows nothing rather than an empty list. */
  | { readonly status: "unread" }
  | {
      readonly status: "held";
      readonly redLines: readonly RecordedRedLine[];
      /**
       * What went wrong with the last edit, in words a Signer can act on, or null. The
       * list is carried alongside it rather than cleared, because a failed edit leaves
       * the standard as it was and they should be looking at it.
       */
      readonly problem: string | null;
    }
  | { readonly status: "not-signed-in" }
  /** No Supabase project is configured for this deployment. */
  | { readonly status: "accounts-not-set-up" };

export const UNREAD: RedLinesState = { status: "unread" };

/** One change to the standard. Three moves, because a list is added to, edited and cut. */
export type RedLineEdit =
  | { readonly kind: "add"; readonly text: string }
  | { readonly kind: "change"; readonly id: string; readonly text: string }
  | { readonly kind: "remove"; readonly id: string };
