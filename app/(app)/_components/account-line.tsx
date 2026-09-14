import Link from "next/link";

import { signOut } from "@/app/(app)/sign-in/actions";
import type { SignerState } from "@/lib/supabase/signer";

/**
 * The account's own legend row, at the foot of the blue field under every working view.
 *
 * It sits below the sheet rather than above it because `DESIGN.md` keeps chrome off the
 * proof stock: the first thing on the page is the sheet and its head, with no navigation
 * bar and no logo lockup. The field below already carries the product's own voice, so the
 * account belongs there, set as a production legend in the same register as the masthead.
 *
 * Sign-out is a form rather than a link because it changes something.
 */
export function AccountLine({ state }: { state: SignerState }) {
  const label = "text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-field-soft";
  const action =
    "cursor-pointer text-[0.88rem] font-semibold text-field-ink underline decoration-mark " +
    "decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark " +
    "focus-visible:text-mark";

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-field-soft/30 py-4">
      {state.status === "signed-in" && (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={label}>Signed in</span>
            <span className="text-[0.88rem] text-field-ink">{state.signer.email}</span>
          </p>
          {/* The way into the library lives here rather than above the sheet, because
              `DESIGN.md` keeps chrome off the proof stock and because a Signer's kept
              documents belong to their account. Sign-out is a form rather than a link
              because it changes something; the library is a place, so it is a link. */}
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
            <Link href="/library" className={action}>
              Your library
            </Link>
            <form action={signOut}>
              <button type="submit" className={action}>
                Sign out
              </button>
            </form>
          </div>
        </>
      )}

      {state.status === "signed-out" && (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={label}>Not signed in</span>
            <span className="max-w-[58ch] text-[0.88rem] text-field-soft">
              Reading a contract works either way. Keeping one needs an account.
            </span>
          </p>
          <Link href="/sign-in" className={action}>
            Sign in
          </Link>
        </>
      )}

      {state.status === "accounts-not-set-up" && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={label}>No accounts</span>
          <span className="max-w-[58ch] text-[0.88rem] text-field-soft">
            This deployment has no database connected yet, so there is nothing to sign in
            to. Reading a contract still works.
          </span>
        </p>
      )}
    </div>
  );
}
