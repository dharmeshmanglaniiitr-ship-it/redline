import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { readSignerState } from "@/lib/supabase/signer";

import { GalleyFoot, LABEL, Masthead } from "../_components/galley";
import { NOT_SET_UP, SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in to Redline",
  description:
    "Sign in to keep the contracts you have read. Reading one does not need an account.",
};

/** Messages a confirmation link can come back with. */
const CONFIRM_NOTICE: Record<string, string> = {
  expired:
    "That link has been used already, or it sat too long. Sign in below, or set the " +
    "account up again to get a fresh one.",
  "accounts-not-set-up": NOT_SET_UP,
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = await readSignerState();
  if (state.status === "signed-in") redirect("/review");

  const confirm = (await searchParams).confirm;
  const notice = typeof confirm === "string" ? (CONFIRM_NOTICE[confirm] ?? null) : null;

  const configured = state.status === "signed-out";

  return (
    <>
      <Masthead document="Account" state="Not signed in" />

      <h1 className="mt-9 max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
        Keep what you have read.
      </h1>

      <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">
        An account keeps the contracts you have put through Redline, so you can open one
        again months later and see what you agreed to. No other account can open them.
      </p>

      {configured ? (
        <SignInForm notice={notice} />
      ) : (
        <section
          aria-labelledby="no-accounts"
          className="mt-12 max-w-[64rem] border-t border-rule pt-8"
        >
          <h2 id="no-accounts" className={LABEL}>
            Not set up yet
          </h2>
          <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink">
            {NOT_SET_UP}
          </p>
        </section>
      )}

      <p className="mt-10 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft">
        You do not need any of this to read a contract.{" "}
        <Link
          href="/review"
          className="font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
        >
          Go straight to the document
        </Link>
        . It is read in your browser either way, and the file stays on your machine.
      </p>

      <GalleyFoot
        parts={[
          "Redline",
          "Your documents are yours alone",
          configured ? "Sheet 1 of 1" : "No accounts configured",
        ]}
      />
    </>
  );
}
