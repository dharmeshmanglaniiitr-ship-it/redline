import type { Metadata } from "next";
import Link from "next/link";

import { assumedJurisdictionName } from "@/lib/analysis/result";
import { listDocuments, type StoredDocument } from "@/lib/supabase/documents";

import { GalleyFoot, LABEL, Masthead, STAMP } from "../_components/galley";
import { keptOn } from "./kept-on";

export const metadata: Metadata = {
  title: "Your library on Redline",
  description:
    "The contracts you have kept, each opening on the reading it was saved with.",
};

/**
 * Everything this Signer has kept: a stack of marked proofs, newest on top.
 *
 * `.impeccable/surfaces/app-app-layout-tsx.md` settles what a row carries — the date it was
 * marked and the standard it was marked against — and `DESIGN.md` settles its form: the
 * ranked index, which is a hairline-ruled ordered list with a tabular numeral, a title and
 * a legend under it. Nothing new is invented here.
 *
 * Every state this page has is a state somebody is actually in. A deployment with no
 * database is missing a feature rather than broken. A Signer who is not signed in is told
 * what an account holds, not scolded. And a Signer with an account and nothing in it is the
 * first thing anybody sees, so it says what to do and nothing about it reads like a
 * failure.
 *
 * The rows come back through row level security and nothing here filters them
 * (`lib/supabase/documents.ts`). That is the whole of why a Signer sees only their own.
 */
export default async function LibraryPage() {
  const listed = await listDocuments();

  if (listed.outcome === "accounts-not-set-up") {
    return (
      <Sheet state="No library here">
        <h1 className={HEAD}>There is no library on this deployment.</h1>
        <p className={INTRO}>
          The database a library would live in has not been connected, so there is nowhere
          to keep anything yet. Reading a contract still works. What it finds stays on the
          page until you close the tab.
        </p>
        <ReadSomething />
      </Sheet>
    );
  }

  if (listed.outcome === "not-signed-in") {
    return (
      <Sheet state="Not signed in">
        <h1 className={HEAD}>Your library sits behind your account.</h1>
        <p className={INTRO}>
          Sign in and the contracts you have kept are here, each one opening on the reading
          it was saved with. Reading a contract needs no account at all.
        </p>
        <Link href="/sign-in" className={`${STAMP} mt-8`}>
          Sign in
        </Link>
      </Sheet>
    );
  }

  if (listed.outcome === "refused") {
    console.error("the library did not load:", listed.detail);
    return (
      <Sheet state="Did not open" alarmed>
        <h1 className={HEAD}>Your library did not open.</h1>
        <p className={INTRO}>
          Nothing has been lost. Whatever you have kept is still kept, so try again in a
          moment, and if it keeps happening it is our end rather than yours.
        </p>
        <ReadSomething />
      </Sheet>
    );
  }

  const documents = listed.documents;

  if (documents.length === 0) {
    return (
      <Sheet state="Nothing kept yet">
        <h1 className={HEAD}>Nothing in here yet.</h1>
        <p className={INTRO}>
          When you read a contract, the foot of the sheet offers to keep it. Take that
          offer and it turns up here carrying the marks it had on the day, so you can come
          back in six months and see what you agreed to without reading it again.
        </p>
        <ReadSomething />
      </Sheet>
    );
  }

  return (
    <Sheet state={heldLegend(documents.length)}>
      <h1 className={HEAD}>What you have kept.</h1>
      <p className={INTRO}>
        Newest first. Opening one shows the reading it was saved with, word for word as it
        stood that day. Nothing is read again unless you ask for it.
      </p>

      <nav aria-labelledby="kept-documents" className="mt-12">
        <h2 id="kept-documents" className={LABEL}>
          Kept documents
        </h2>
        <ol className="mt-5 border-t border-rule">
          {documents.map((document, index) => (
            <li key={document.id} className="border-b border-rule">
              <Link
                href={`/library/${document.id}`}
                className="group flex items-baseline gap-5 py-5 transition-colors duration-200 hover:bg-stock-shade focus-visible:bg-stock-shade"
              >
                <span className="numeric w-8 shrink-0 text-[0.82rem] font-semibold text-ink-soft group-hover:text-mark-deep">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.06rem] font-semibold leading-[1.3] text-ink">
                    {document.name}
                  </span>
                  <span className="numeric mt-2 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                    {legendFor(document).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <ReadSomething />
    </Sheet>
  );
}

const HEAD =
  "mt-9 max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink";

const INTRO = "mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft";

/** The sheet every state of this page sits on, so none of them invents its own frame. */
function Sheet({
  state,
  alarmed = false,
  children,
}: {
  state: string;
  alarmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Masthead document="Your library" state={state} alarmed={alarmed} />
      {children}
      <GalleyFoot
        parts={["Redline", "Kept against your account and no other", "Your library"]}
      />
    </>
  );
}

function ReadSomething() {
  return (
    <p className="mt-10 text-[0.94rem] leading-[1.55] text-ink-soft">
      <Link
        href="/review"
        className="font-semibold text-ink underline decoration-mark decoration-2 underline-offset-4 transition-colors duration-200 hover:text-mark-deep focus-visible:text-mark-deep"
      >
        Read a contract
      </Link>{" "}
      whenever you have one in front of you.
    </p>
  );
}

function heldLegend(held: number): string {
  return held === 1 ? "1 document kept" : `${held} documents kept`;
}

/**
 * The legend under a row: when it was kept, what the reading found, which law it was read
 * under, and what standard it was marked against.
 *
 * A document kept with no reading says so in as many words. It happens — the deployment
 * had no model access, or the analysis did not come back and the Signer kept the wording
 * anyway — and a row that quietly showed "nothing marked" for it would read as a contract
 * that came back clean, which is the most dangerous thing this product could say
 * (`docs/spec-v1.md`).
 */
function legendFor(document: StoredDocument): string[] {
  const law = assumedJurisdictionName(document.jurisdiction);
  const reading = document.reading;

  if (reading === null) {
    return [`Kept ${keptOn(document.savedAt)}`, "No reading kept with it"];
  }

  return [
    `Read ${keptOn(reading.readAt)}`,
    marksLegend(reading.marks),
    law === null ? "Governing law not known" : `Under ${law}`,
    standardLegend(reading.redLines.length),
  ];
}

/** How many terms carry a mark, said the way the review sheet says it. */
function marksLegend(marks: number): string {
  if (marks === 0) return "Nothing marked";
  return marks === 1 ? "1 term marked" : `${marks} terms marked`;
}

/** What the document was marked against, which is Redline's own list plus theirs. */
function standardLegend(redLines: number): string {
  if (redLines === 0) return "Marked against Redline's checklist";
  return redLines === 1
    ? "Marked against 1 line of your own"
    : `Marked against ${redLines} lines of your own`;
}
