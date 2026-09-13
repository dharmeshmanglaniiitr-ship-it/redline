/**
 * Who is signed in, in the three states this product actually has.
 *
 * Signed-out is a real state and is built as one: a Signer with no account can still bring
 * a contract in and read what came out of it. "Accounts are not set up" is a third state
 * rather than a kind of failure, because a deployment without a Supabase project is a
 * working Redline missing one feature, and saying "we could not reach the server" about it
 * would be a lie told to whoever has to fix it.
 *
 * Nothing here mocks a session. There is no development bypass and no fake Signer; a
 * request with no valid session reads as signed out, which is what it is.
 */

import { serverSupabase } from "./server";

export interface Signer {
  /** The account id every row in `documents` is scoped to. */
  readonly id: string;
  /** The address they signed in with, shown back to them so they know which account. */
  readonly email: string;
}

export type SignerState =
  | { readonly status: "signed-in"; readonly signer: Signer }
  | { readonly status: "signed-out" }
  /** No Supabase project is configured for this deployment. */
  | { readonly status: "accounts-not-set-up" };

/**
 * Read the current Signer from the request's cookies.
 *
 * Uses `getClaims`, which verifies the access token's signature rather than believing what
 * the cookie says. A cookie is written by the browser, so an unverified session read from
 * one decides nothing about who this is.
 */
export async function readSignerState(): Promise<SignerState> {
  const supabase = await serverSupabase();
  if (supabase === null) return { status: "accounts-not-set-up" };

  const { data, error } = await supabase.auth.getClaims();
  if (error !== null || data === null) return { status: "signed-out" };

  const { sub, email } = data.claims;
  if (typeof sub !== "string" || sub === "") return { status: "signed-out" };

  return {
    status: "signed-in",
    signer: { id: sub, email: typeof email === "string" ? email : "" },
  };
}
