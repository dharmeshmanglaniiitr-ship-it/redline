"use client";

import { useActionState, useState } from "react";

import { LABEL, ProofMark, STAMP } from "../_components/galley";
import { signInOrCreateAccount } from "./actions";
import { IDLE, SHORTEST_PASSWORD, type SignInState } from "./state";

type Mode = "sign-in" | "create-account";

const FIELD =
  "mt-2 block w-full max-w-[34ch] border border-rule bg-transparent px-3 py-2.5 " +
  "text-[1rem] leading-[1.5] text-ink placeholder:text-ink-soft";

/**
 * The sign-in screen's working half.
 *
 * One form does both jobs. Which one is carried in a hidden field, so the server runs the
 * same validation either way and there is never a moment where the two halves disagree
 * about what a password has to be.
 *
 * A refusal is spoken in three ways at once — a proof mark, the word, and a live region
 * that announces it — because the Never-By-Colour Rule in `DESIGN.md` is an accessibility
 * commitment rather than a style. Nothing here is red and nothing else.
 */
export function SignInForm({ notice }: { notice: string | null }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [state, submit, working] = useActionState(signInOrCreateAccount, IDLE);
  // Held here because React empties an uncontrolled form once its action returns, and
  // retyping an address to be told a second time that the password is wrong is a small
  // cruelty. The password is not held: after a refusal it should be typed again.
  const [email, setEmail] = useState("");
  // A message about the password is about the password that was typed. Changing what the
  // form is for puts it out of date, so it goes when the Signer switches.
  const [settled, setSettled] = useState<SignInState | null>(null);

  const creating = mode === "create-account";
  const showing = state === settled ? IDLE : state;

  function switchTo(next: Mode) {
    setSettled(state);
    setMode(next);
  }

  if (showing.status === "check-your-email") {
    return (
      <section aria-labelledby="check-your-email" className="mt-12 max-w-[64rem] border-t border-rule pt-8">
        <h2 id="check-your-email" className={LABEL}>
          One more step
        </h2>
        <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink">
          A link is on its way to {showing.email}. Open it and you are in. If nothing
          arrives in a minute or two, check the spam folder.
        </p>
        <button
          type="button"
          className="mt-6 cursor-pointer text-[0.94rem] font-semibold text-ink-soft underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink"
          onClick={() => {
            setEmail("");
            switchTo("create-account");
          }}
        >
          Use a different address
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="sign-in-form" className="mt-12 max-w-[64rem] border-t border-rule pt-8">
      <h2 id="sign-in-form" className={LABEL}>
        {creating ? "Set up an account" : "Sign in"}
      </h2>

      {/* Anything the last attempt came back with, announced as well as drawn. */}
      <p role="alert" className="mt-4 max-w-[58ch]">
        {showing.status === "refused" && (
          <span className="flex items-start gap-2 text-[0.98rem] leading-[1.5] text-mark-deep">
            <ProofMark kind="query" className="mt-0.5 h-5 w-5" />
            <span>{showing.message}</span>
          </span>
        )}
        {showing.status === "accounts-not-set-up" && (
          <span className="flex items-start gap-2 text-[0.98rem] leading-[1.5] text-mark-deep">
            <ProofMark kind="strike" className="mt-0.5 h-5 w-5" />
            <span>{NOT_SET_UP}</span>
          </span>
        )}
        {showing.status === "idle" && notice !== null && (
          <span className="flex items-start gap-2 text-[0.98rem] leading-[1.5] text-mark-deep">
            <ProofMark kind="query" className="mt-0.5 h-5 w-5" />
            <span>{notice}</span>
          </span>
        )}
      </p>

      <form action={submit} className="mt-6">
        <input type="hidden" name="intent" value={creating ? "create-account" : "sign-in"} />

        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 sm:max-w-[54rem]">
          <div>
            <label htmlFor="email" className={LABEL}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="password" className={LABEL}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={creating ? SHORTEST_PASSWORD : undefined}
              aria-describedby={creating ? "password-rule" : undefined}
              className={FIELD}
            />
            {creating && (
              <p id="password-rule" className="mt-2 max-w-[34ch] text-[0.94rem] leading-[1.55] text-ink-soft">
                {SHORTEST_PASSWORD} characters at least.
              </p>
            )}
          </div>
        </div>

        <button type="submit" className={`${STAMP} mt-8`} disabled={working}>
          {working ? "Working" : creating ? "Set it up" : "Sign in"}
        </button>
      </form>

      <p className="mt-7 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft">
        {creating ? "Been here before? " : "No account yet? "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
          onClick={() => switchTo(creating ? "sign-in" : "create-account")}
        >
          {creating ? "Sign in instead" : "Set one up"}
        </button>
        .
      </p>
    </section>
  );
}

/**
 * Said when there is no Supabase project behind this deployment. It is aimed at whoever
 * set the deployment up as much as at whoever is reading it, because calling a missing
 * configuration a network problem would send them looking in the wrong place.
 */
export const NOT_SET_UP =
  "Accounts are not switched on here yet. The database this deployment would keep them " +
  "in has not been connected, so there is nothing to sign in to. Reading a contract " +
  "still works.";
