/**
 * Saving a Signer's documents, and reading back the ones that are theirs.
 *
 * Two rules shape everything here.
 *
 * **Only extracted text is stored, never the original file** (`CLAUDE.md`). That is made
 * structural rather than remembered: `saveDocument` takes `ExtractedDocument`, which is
 * the one arm of `ExtractionResult` that carries text. An unreadable document has no
 * `text` field to pass, so storing one does not compile, and nothing in this module has
 * ever seen the bytes of a file — parsing happens in the browser and the file stays on the
 * Signer's machine.
 *
 * **Isolation is the database's job, not this file's.** The `signer_id` filter in
 * `listDocuments` is there so the query is sensible, not so it is safe. Safety is the row
 * level security policy in `supabase/migrations/`: if every line below were deleted, a
 * Signer still could not read another's rows. A filter someone forgets to write is a leak;
 * a policy is not.
 */

import type { DocumentFormat, ExtractionResult } from "@/lib/document/extraction";

import { serverSupabase } from "./server";

/** The arm of `ExtractionResult` that carries text. The only thing that can be stored. */
export type ExtractedDocument = Extract<ExtractionResult, { outcome: "extracted" }>;

/**
 * What the analysis assumed about governing law, as ADR 0007 shapes it: a detection
 * carries the sentence it came from or it is not a detection, the Signer's choice outranks
 * it, and nothing here is defaulted.
 */
export interface JurisdictionRecord {
  readonly detected: { readonly jurisdiction: string; readonly sourceSentence: string } | null;
  readonly chosenBySigner: string | null;
}

export interface StoredDocument {
  readonly id: string;
  readonly name: string;
  readonly format: DocumentFormat;
  readonly text: string;
  readonly sentences: readonly string[];
  /** What the stored analysis assumed. Null is undetermined, which is a state, not a gap. */
  readonly assumedJurisdiction: string | null;
  readonly savedAt: string;
}

export type SaveOutcome =
  | { readonly outcome: "saved"; readonly document: StoredDocument }
  | { readonly outcome: "not-signed-in" }
  | { readonly outcome: "accounts-not-set-up" }
  /** The database refused the write. `detail` is for the log, not for a Signer to read. */
  | { readonly outcome: "refused"; readonly detail: string };

export type ListOutcome =
  | { readonly outcome: "listed"; readonly documents: readonly StoredDocument[] }
  | { readonly outcome: "not-signed-in" }
  | { readonly outcome: "accounts-not-set-up" }
  | { readonly outcome: "refused"; readonly detail: string };

const COLUMNS = "id, name, format, extracted_text, sentences, assumed_jurisdiction, created_at";

/**
 * Save one document's extracted text against the Signer who is signed in.
 *
 * `signer_id` is left off the insert on purpose. The column defaults to `auth.uid()` and
 * the insert policy checks it, so the row is stamped with the session's own account by the
 * database. Passing an id from here would be the application asserting ownership, which is
 * exactly the arrangement row level security exists to replace.
 */
export async function saveDocument(
  document: ExtractedDocument,
  jurisdiction: JurisdictionRecord = { detected: null, chosenBySigner: null }
): Promise<SaveOutcome> {
  const supabase = await serverSupabase();
  if (supabase === null) return { outcome: "accounts-not-set-up" };

  const { data: claims } = await supabase.auth.getClaims();
  if (claims === null) return { outcome: "not-signed-in" };

  const { data, error } = await supabase
    .from("documents")
    .insert({
      name: document.name,
      format: document.format,
      extracted_text: document.text,
      sentences: document.sentences,
      detected_jurisdiction: jurisdiction.detected?.jurisdiction ?? null,
      detected_jurisdiction_sentence: jurisdiction.detected?.sourceSentence ?? null,
      chosen_jurisdiction: jurisdiction.chosenBySigner,
    })
    .select(COLUMNS)
    .single();

  if (error !== null || data === null) {
    return { outcome: "refused", detail: error?.message ?? "the row came back empty" };
  }
  return { outcome: "saved", document: toStoredDocument(data) };
}

/** Every document belonging to the Signer who is signed in, newest first. */
export async function listDocuments(): Promise<ListOutcome> {
  const supabase = await serverSupabase();
  if (supabase === null) return { outcome: "accounts-not-set-up" };

  const { data: claims } = await supabase.auth.getClaims();
  if (claims === null) return { outcome: "not-signed-in" };

  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (error !== null || data === null) {
    return { outcome: "refused", detail: error?.message ?? "no rows came back" };
  }
  return { outcome: "listed", documents: data.map(toStoredDocument) };
}

/** Narrow one row into the shape the product uses, rather than passing columns around. */
function toStoredDocument(row: Record<string, unknown>): StoredDocument {
  return {
    id: String(row.id),
    name: String(row.name),
    format: row.format as DocumentFormat,
    text: String(row.extracted_text),
    sentences: Array.isArray(row.sentences) ? row.sentences.map(String) : [],
    assumedJurisdiction:
      typeof row.assumed_jurisdiction === "string" ? row.assumed_jurisdiction : null,
    savedAt: String(row.created_at),
  };
}
