/**
 * A Signer's red lines: reading their standard back, and letting them change it.
 *
 * The same two rules as `lib/supabase/documents.ts`, for the same reasons.
 *
 * **Isolation is the database's job, not this file's.** Nothing below filters on
 * `signer_id` and nothing below sends one. The column defaults to `auth.uid()` and the
 * policies in `supabase/migrations/` decide what a session can see and change, so if every
 * line here were deleted a Signer still could not read or rewrite another's standard. A
 * filter someone forgets to write is a leak; a policy is not.
 *
 * **Not having an account is a state, not a failure.** Redline reads a pasted contract with
 * no Supabase project behind it at all (`lib/supabase/config.ts`), and a Signer who is not
 * signed in gets the analysis without their standard rather than an error. So every
 * function here returns an outcome union, and `signerRedLines` — the one the analysis
 * calls — folds all of it down to "the lines we know about", which is an empty list more
 * often than not.
 *
 * Each write returns the whole list afterwards rather than the row it touched. The screen
 * then shows what the database holds instead of what the browser hoped it would hold,
 * which matters here because a standing standard is edited in several small moves and one
 * of them silently failing would leave a Signer reading a list that is not their own.
 */

import type { RedLine } from "@/lib/analysis/result";

import { serverSupabase } from "./server";

/** One recorded red line, with the handle the screen edits and deletes it by. */
export interface StoredRedLine {
  readonly id: string;
  /** The Signer's own words, as they wrote them. */
  readonly text: string;
}

export type RedLinesOutcome =
  | { readonly outcome: "listed"; readonly redLines: readonly StoredRedLine[] }
  | { readonly outcome: "not-signed-in" }
  | { readonly outcome: "accounts-not-set-up" }
  /** The database refused. `detail` is for the log, not for a Signer to read. */
  | { readonly outcome: "refused"; readonly detail: string };

const COLUMNS = "id, wording";

/** Longer than a line, and it is a document rather than a standard. Mirrors the check. */
export const LONGEST_RED_LINE = 300;

/**
 * Every red line this Signer has recorded, oldest first.
 *
 * Oldest first, not newest: this is a standing document rather than a feed, and a list
 * that reorders itself when somebody adds to it is a list they have to re-read every time.
 */
export async function listRedLines(): Promise<RedLinesOutcome> {
  return withSession(async (supabase) => {
    const { data, error } = await supabase
      .from("red_lines")
      .select(COLUMNS)
      .order("created_at", { ascending: true });

    if (error !== null || data === null) {
      return { outcome: "refused", detail: error?.message ?? "no rows came back" };
    }
    return { outcome: "listed", redLines: data.map(toStoredRedLine) };
  });
}

/**
 * Record a new line.
 *
 * `signer_id` is left off the insert on purpose. The column defaults to `auth.uid()` and
 * the insert policy checks it, so the row is stamped with the session's own account by the
 * database rather than by this function asserting whose it is.
 */
export async function addRedLine(wording: string): Promise<RedLinesOutcome> {
  const text = wording.trim();
  if (text === "") return { outcome: "refused", detail: "an empty line is not a standard" };

  return withSession(async (supabase) => {
    const { error } = await supabase.from("red_lines").insert({ wording: text });
    if (error !== null) return { outcome: "refused", detail: error.message };
    return listRedLines();
  });
}

/** Rewrite one line the Signer already has. */
export async function changeRedLine(id: string, wording: string): Promise<RedLinesOutcome> {
  const text = wording.trim();
  if (text === "") return { outcome: "refused", detail: "an empty line is not a standard" };

  return withSession(async (supabase) => {
    const { error } = await supabase.from("red_lines").update({ wording: text }).eq("id", id);
    if (error !== null) return { outcome: "refused", detail: error.message };
    return listRedLines();
  });
}

/** Take one line off the standard. */
export async function removeRedLine(id: string): Promise<RedLinesOutcome> {
  return withSession(async (supabase) => {
    const { error } = await supabase.from("red_lines").delete().eq("id", id);
    if (error !== null) return { outcome: "refused", detail: error.message };
    return listRedLines();
  });
}

/**
 * The standard to mark a document against, as the analysis takes it.
 *
 * Every way of not having one — no Supabase project, no session, a query that failed —
 * comes back as an empty list, because all three mean the same thing to the reading: there
 * is no standard beyond Redline's own, so the document is read worst first
 * (`docs/adr/0009`). None of them is a reason to refuse a Signer the analysis they came
 * for, which is what returning an error from here would amount to.
 *
 * A refusal is logged rather than swallowed: a signed-in Signer whose lines did not load
 * would otherwise see a re-ranking quietly do nothing.
 */
export async function signerRedLines(): Promise<readonly RedLine[]> {
  const held = await listRedLines();
  if (held.outcome === "refused") {
    console.error("the Signer's red lines did not load:", held.detail);
  }
  if (held.outcome !== "listed") return [];
  return held.redLines.map((redLine) => ({ text: redLine.text }));
}

/**
 * Run something against the Signer's own session, or say which of the two ways there is no
 * session this is.
 *
 * They are different things and the screen says so differently: a deployment with no
 * Supabase project is missing a feature, and a Signer who has been signed out mid-session
 * needs to sign in again. Collapsing them into one error would tell whoever has to fix it
 * the wrong thing.
 */
async function withSession(
  run: (supabase: NonNullable<Awaited<ReturnType<typeof serverSupabase>>>) => Promise<RedLinesOutcome>
): Promise<RedLinesOutcome> {
  const supabase = await serverSupabase();
  if (supabase === null) return { outcome: "accounts-not-set-up" };

  const { data: claims } = await supabase.auth.getClaims();
  if (claims === null) return { outcome: "not-signed-in" };

  return run(supabase);
}

/** Narrow one row into the shape the product uses, rather than passing columns around. */
function toStoredRedLine(row: Record<string, unknown>): StoredRedLine {
  return { id: String(row.id), text: String(row.wording) };
}
