import type { Metadata } from "next";
import Link from "next/link";

import { openDocument } from "@/lib/supabase/documents";

import { GalleyFoot, Masthead, STAMP } from "../../_components/galley";
import { keptOn } from "../kept-on";
import { SavedDocument } from "../saved-document";
import type { KeptReading } from "../saved-state";

export const metadata: Metadata = {
  title: "A kept document on Redline",
  description: "A contract you kept, opened on the reading it was saved with.",
};

/**
 * One document out of the library, opened on the reading it was saved with.
 *
 * No model is called here and none can be: `openDocument` reads two rows and hands back
 * what was stored (`docs/adr/0010`). That is what makes this page work six months later on
 * a deployment whose model is unreachable, which is the state the whole build is in today.
 *
 * A Signer naming a document that is not theirs gets the same answer as one naming a
 * document that never existed, because the select policy returns no row either way and
 * nothing here asks a second question to tell them apart. "Not in your library" is all this
 * page knows and all it says.
 */
export default async function KeptDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opened = await openDocument(id);

  if (opened.outcome === "accounts-not-set-up") {
    return (
      <Missing
        state="No library here"
        head="There is no library on this deployment."
        body={
          "The database a library would live in has not been connected, so there is " +
          "nothing kept and nothing to open. Reading a contract still works."
        }
      />
    );
  }

  if (opened.outcome === "not-signed-in") {
    return (
      <Missing
        state="Not signed in"
        head="Sign in to open this."
        body={
          "A kept document opens only for the account that kept it. Sign in and it is " +
          "here, with the marks it carried when you kept it."
        }
        action={{ href: "/sign-in", label: "Sign in" }}
      />
    );
  }

  if (opened.outcome === "refused") {
    console.error("a kept document did not open:", opened.detail);
    return (
      <Missing
        state="Did not open"
        alarmed
        head="That document did not open."
        body={
          "Nothing has been lost. Try again in a moment, and if it keeps happening it is " +
          "our end rather than yours."
        }
      />
    );
  }

  if (opened.outcome === "not-in-your-library") {
    return (
      <Missing
        state="Not here"
        head="That one is not in your library."
        body={
          "Either it was never kept under this account, or it has since been removed. " +
          "What you do have is a click away."
        }
      />
    );
  }

  const { document, reading } = opened;

  if (reading.outcome === "unreadable") {
    // The detail is for whoever has to fix it. What the Signer is told is that the reading
    // did not open and the wording did (`app/(app)/library/saved-document.tsx`).
    console.error(`the reading kept with document ${document.id} did not hold up:`, reading.problem);
  }

  const kept: KeptReading =
    reading.outcome === "read"
      ? {
          status: "kept",
          result: reading.result,
          // The reading's own date rather than the document's: they are written in one
          // move today, and a library that later kept them apart should show the reading's.
          readOn: keptOn(document.reading?.readAt ?? document.savedAt),
        }
      : reading.outcome === "none"
        ? { status: "none" }
        : { status: "unreadable" };

  return (
    <SavedDocument
      document={{ name: document.name, format: document.format, text: document.text }}
      keptOn={keptOn(document.savedAt)}
      reading={kept}
    />
  );
}

/** Every way this page can have nothing to open, on the sheet the rest of the app uses. */
function Missing({
  state,
  head,
  body,
  action,
  alarmed = false,
}: {
  state: string;
  head: string;
  body: string;
  action?: { href: string; label: string };
  alarmed?: boolean;
}) {
  return (
    <>
      <Masthead document="A kept document" state={state} alarmed={alarmed} />

      <h1 className="mt-9 max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
        {head}
      </h1>
      <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">{body}</p>

      {action !== undefined ? (
        <Link href={action.href} className={`${STAMP} mt-8`}>
          {action.label}
        </Link>
      ) : (
        <Link href="/library" className={`${STAMP} mt-8`}>
          Your library
        </Link>
      )}

      <GalleyFoot
        parts={["Redline", "Kept against your account and no other", "Nothing to open"]}
      />
    </>
  );
}
