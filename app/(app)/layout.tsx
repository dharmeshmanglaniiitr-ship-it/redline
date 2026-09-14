import { readSignerState } from "@/lib/supabase/signer";

import { AccountLine } from "./_components/account-line";
import { TrimMarks, WHERE_REDLINE_STOPS } from "./_components/galley";
import { SignerProvider } from "./_components/signer-context";

/**
 * The frame behind sign-in that holds every working view.
 *
 * It is the same world as the landing page because the proof galley was never a
 * marketing device: the marking-blue field carries the page, the document sits on it as a
 * sheet of proof stock with real trim corners, and the sheet runs edge to edge with
 * nothing above it. Each view fills the sheet with its own masthead, body and foot.
 *
 * The session is read once here, for the whole segment. That keeps every view on one
 * verified answer to who is signed in — the account legend at the foot of the field and
 * whatever the view itself does with it — instead of each asking separately and getting
 * answers that can disagree. Signed out is a real state and every view works in it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const signer = await readSignerState();

  return (
    <main className="flex-1">
      <div className="galley relative bg-stock text-ink">
        <TrimMarks />
        <div className="mx-auto w-full max-w-[84rem] px-5 py-10 sm:px-8 lg:py-14 xl:px-16">
          <SignerProvider state={signer}>{children}</SignerProvider>
        </div>
      </div>

      <div className="bg-field">
        <div className="mx-auto w-full max-w-[84rem] px-5 sm:px-8">
          <AccountLine state={signer} />
        </div>
        <footer className="mx-auto flex w-full max-w-[84rem] flex-wrap items-baseline justify-between gap-x-10 gap-y-3 px-5 py-10 sm:px-8">
          <span className="font-document text-[1.05rem] italic text-field-ink">Redline</span>
          <span className="max-w-[58ch] text-[0.83rem] leading-relaxed text-field-soft">
            {WHERE_REDLINE_STOPS}
          </span>
        </footer>
      </div>
    </main>
  );
}
