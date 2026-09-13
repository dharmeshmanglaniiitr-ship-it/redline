/**
 * What keeping a document in the library can come back as.
 *
 * Apart from `actions.ts` because a `"use server"` module may only export functions, and
 * the client half needs the type.
 */

export type KeepState =
  | { readonly status: "untouched" }
  | { readonly status: "kept"; readonly name: string }
  | { readonly status: "not-signed-in" }
  | { readonly status: "accounts-not-set-up" }
  | { readonly status: "refused"; readonly message: string };

export const UNTOUCHED: KeepState = { status: "untouched" };
