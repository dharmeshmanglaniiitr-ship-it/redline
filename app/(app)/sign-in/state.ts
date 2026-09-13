/**
 * What the sign-in screen can be showing, and the one rule it states out loud.
 *
 * Kept apart from `actions.ts` because a `"use server"` module may only export functions,
 * and both the form and the action need these.
 */

export type SignInState =
  | { readonly status: "idle" }
  /** Something was wrong with what was typed, or with the account. */
  | { readonly status: "refused"; readonly message: string }
  /** The account exists but the address has to be confirmed before it can be used. */
  | { readonly status: "check-your-email"; readonly email: string }
  /** No Supabase project is configured, so this deployment has no accounts at all. */
  | { readonly status: "accounts-not-set-up" };

export const IDLE: SignInState = { status: "idle" };

/**
 * The shortest password this product will set up. Stated in one place because the form
 * tells the Signer the rule before they type and the action enforces the same one after.
 */
export const SHORTEST_PASSWORD = 8;
