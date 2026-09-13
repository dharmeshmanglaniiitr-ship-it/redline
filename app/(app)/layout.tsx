import { TrimMarks } from "./_components/galley";

/**
 * The frame behind sign-in that holds every working view.
 *
 * It is the same world as the landing page because the proof galley was never a
 * marketing device: the marking-blue field carries the page, the document sits on it as
 * a sheet of proof stock with real trim corners, and the sheet runs edge to edge with
 * nothing above it. Each view fills the sheet with its own masthead, body and foot.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="galley relative bg-stock text-ink">
        <TrimMarks />
        <div className="mx-auto w-full max-w-[84rem] px-5 py-10 sm:px-8 lg:py-14 xl:px-16">
          {children}
        </div>
      </div>

      <div className="bg-field">
        <footer className="mx-auto flex w-full max-w-[84rem] flex-wrap items-baseline justify-between gap-x-10 gap-y-3 px-5 py-10 sm:px-8">
          <span className="font-document text-[1.05rem] italic text-field-ink">Redline</span>
          <span className="max-w-[58ch] text-[0.83rem] leading-relaxed text-field-soft">
            Redline explains a document and drafts language you can send. It does not tell
            you whether to sign, and it is not a law firm.
          </span>
        </footer>
      </div>
    </main>
  );
}
