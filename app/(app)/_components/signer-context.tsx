"use client";

import { createContext, useContext } from "react";

import type { SignerState } from "@/lib/supabase/signer";

/**
 * Who is signed in, made available to the client half of the working views.
 *
 * The session is read once, on the server, in `app/(app)/layout.tsx`, and handed down from
 * there. Client components never ask Supabase who they are talking to: a session read in
 * the browser is a cookie's word for it, and the only reading that decides anything is the
 * verified one the server already did.
 */
const SignerContext = createContext<SignerState | null>(null);

export function SignerProvider({
  state,
  children,
}: {
  state: SignerState;
  children: React.ReactNode;
}) {
  return <SignerContext.Provider value={state}>{children}</SignerContext.Provider>;
}

export function useSignerState(): SignerState {
  const state = useContext(SignerContext);
  if (state === null) {
    throw new Error(
      "useSignerState was called outside SignerProvider. Every working view renders " +
        "inside app/(app)/layout.tsx, which provides it."
    );
  }
  return state;
}
