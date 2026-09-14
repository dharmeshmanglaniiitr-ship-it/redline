/**
 * Saving a Signer's documents with the reading they were saved with, and opening them
 * again.
 *
 * Three rules shape everything here.
 *
 * **Only extracted text is stored, never the original file** (`CLAUDE.md`). That is made
 * structural rather than remembered: `saveDocument` takes `ExtractedDocument`, which is
 * the one arm of `ExtractionResult` that carries text. An unreadable document has no
 * `text` field to pass, so storing one does not compile, and nothing in this module has
 * ever seen the bytes of a file — parsing happens in the browser and the file stays on the
 * Signer's machine.
 *
 * **Isolation is the database's job, not this file's.** Nothing below filters on
 * `signer_id` and nothing below sends one. The column defaults to `auth.uid()` and the
 * policies in `supabase/migrations/` decide what a session can see and change, so if every
 * line here were deleted, a Signer still could not read another's rows. A filter someone
 * forgets to write is a leak; a policy is not.
 *
 * **A saved document carries what Redline said about it** (`docs/adr/0010`). Opening one
 * makes no model call: the reading comes back out of `public.document_readings`, is checked
 * against the document's own stored text by `lib/analysis/reading.ts`, and is drawn as it
 * stood. A document can also be saved with no reading at all — the deployment had no model
 * access, or the analysis did not come back — and that stays a state the library says out
 * loud rather than an empty report.
 */

import { readBackReading, type RecordedReading } from "@/lib/analysis/reading";
import type { AnalysisResult, Jurisdiction } from "@/lib/analysis/result";
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

/**
 * As much of a saved reading as a list of documents needs: when it was made, how many
 * terms it marked, and the standard it was marked against (`.impeccable/surfaces/`).
 * The findings themselves are not read until a document is opened.
 */
export interface SavedReading {
  readonly readAt: string;
  readonly marks: number;
  readonly redLines: readonly string[];
}

export interface StoredDocument {
  readonly id: string;
  readonly name: string;
  readonly format: DocumentFormat;
  readonly text: string;
  readonly sentences: readonly string[];
  /**
   * What the reading assumed about governing law, rebuilt from the row's three columns
   * into the union the product uses (`docs/adr/0007`). Undetermined is one arm of it, not
   * a missing value, and it never quietly becomes the United States.
   */
  readonly jurisdiction: Jurisdiction;
  readonly savedAt: string;
  /** Null for a document kept with no reading, which is a real state and not a gap. */
  readonly reading: SavedReading | null;
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

/** What came back out of the library for one saved document. */
export type OpenedReading =
  | { readonly outcome: "read"; readonly result: AnalysisResult }
  /** The document was kept without one. Nothing failed; there was nothing to keep. */
  | { readonly outcome: "none" }
  /** Stored, but it no longer holds up. `problem` is for the log (`lib/analysis/reading.ts`). */
  | { readonly outcome: "unreadable"; readonly problem: string };

export type OpenOutcome =
  | {
      readonly outcome: "opened";
      readonly document: StoredDocument;
      readonly reading: OpenedReading;
    }
  /** No row of this Signer's has that id. Whether anyone else's does is not answered. */
  | { readonly outcome: "not-in-your-library" }
  | { readonly outcome: "not-signed-in" }
  | { readonly outcome: "accounts-not-set-up" }
  | { readonly outcome: "refused"; readonly detail: string };

/**
 * The columns, as literals rather than as concatenations. `@supabase/supabase-js` reads
 * the select string at the type level to work out what a row comes back as, so a column
 * list joined with `+` widens to `string` and takes the row's type down with it.
 */
const LAW_COLUMNS =
  "detected_jurisdiction, detected_jurisdiction_sentence, chosen_jurisdiction";

const COLUMNS =
  `id, name, format, extracted_text, sentences, ${LAW_COLUMNS}, created_at` as const;

/** What a row of the library needs about a reading, short of the reading itself. */
const READING_LEGEND = "document_readings(read_at, marks, red_lines)" as const;

/** The reading in full, for a document being opened. */
const READING_IN_FULL =
  `document_readings(read_at, marks, red_lines, summary_sender, summary_engagement, summary_plain_english, flags, checked_clean)` as const;

/**
 * Save one document's extracted text, and the reading it was saved with, against the
 * Signer who is signed in.
 *
 * `signer_id` is left off both inserts on purpose. The column defaults to `auth.uid()` and
 * the insert policies check it, so each row is stamped with the session's own account by
 * the database. Passing an id from here would be the application asserting ownership, which
 * is exactly the arrangement row level security exists to replace.
 *
 * The reading is written second, because it points at the document. If it will not go in,
 * the document is taken back out rather than left behind: a Signer who was told the save
 * failed should not find the document in their library tomorrow with nothing said about it.
 * If that removal fails too, what is left is a document kept with no reading — which is a
 * state the library already has words for, so the worst case degrades into something
 * honest rather than into something broken.
 */
export async function saveDocument(
  document: ExtractedDocument,
  jurisdiction: JurisdictionRecord = { detected: null, chosenBySigner: null },
  reading: RecordedReading | null = null
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

  const id = String(data.id);
  if (reading === null) {
    return { outcome: "saved", document: toStoredDocument(data, null) };
  }

  const kept = await supabase
    .from("document_readings")
    .insert({
      document_id: id,
      summary_sender: reading.summary.sender,
      summary_engagement: reading.summary.engagement,
      summary_plain_english: reading.summary.plainEnglish,
      flags: reading.flags,
      checked_clean: reading.checkedClean,
      red_lines: reading.redLines,
    })
    .select("read_at, marks, red_lines")
    .single();

  if (kept.error !== null || kept.data === null) {
    await supabase.from("documents").delete().eq("id", id);
    return {
      outcome: "refused",
      detail: kept.error?.message ?? "the reading came back empty",
    };
  }

  return { outcome: "saved", document: toStoredDocument(data, toSavedReading(kept.data)) };
}

/** Every document belonging to the Signer who is signed in, newest first. */
export async function listDocuments(): Promise<ListOutcome> {
  const supabase = await serverSupabase();
  if (supabase === null) return { outcome: "accounts-not-set-up" };

  const { data: claims } = await supabase.auth.getClaims();
  if (claims === null) return { outcome: "not-signed-in" };

  const { data, error } = await supabase
    .from("documents")
    .select(`${COLUMNS}, ${READING_LEGEND}`)
    .order("created_at", { ascending: false });

  if (error !== null || data === null) {
    return { outcome: "refused", detail: error?.message ?? "no rows came back" };
  }
  return {
    outcome: "listed",
    documents: data.map((row) => toStoredDocument(row, toSavedReading(embedded(row)))),
  };
}

/**
 * One saved document and what Redline said about it, with no model call anywhere in it.
 *
 * The id is not filtered by `signer_id` here and does not need to be: the select policy
 * decides it, so a Signer naming another's id gets no row rather than a refusal, and the
 * answer is the same one they would get for an id that never existed. That is the right
 * answer — "not in your library" tells them what they can act on without telling them
 * whether it is in somebody else's.
 */
export async function openDocument(id: string): Promise<OpenOutcome> {
  const supabase = await serverSupabase();
  if (supabase === null) return { outcome: "accounts-not-set-up" };

  const { data: claims } = await supabase.auth.getClaims();
  if (claims === null) return { outcome: "not-signed-in" };

  const { data, error } = await supabase
    .from("documents")
    .select(`${COLUMNS}, ${READING_IN_FULL}`)
    .eq("id", id)
    .maybeSingle();

  if (error !== null) return { outcome: "refused", detail: error.message };
  if (data === null) return { outcome: "not-in-your-library" };

  const stored = embedded(data);
  const document = toStoredDocument(data, toSavedReading(stored));

  return { outcome: "opened", document, reading: toOpenedReading(stored, document) };
}

/**
 * The stored reading, read back into the result the screen draws.
 *
 * Everything is checked against the document's own stored text on the way out, including
 * every citation (`lib/analysis/reading.ts`). A reading that does not hold up is reported
 * as one that could not be read back, never as a shorter list of findings — a Signer shown
 * three flags where four were saved has been told something false about their own contract.
 */
function toOpenedReading(
  stored: Record<string, unknown> | null,
  document: StoredDocument
): OpenedReading {
  if (stored === null) return { outcome: "none" };

  const read = readBackReading(
    {
      summary: {
        sender: stored.summary_sender,
        engagement: stored.summary_engagement,
        plainEnglish: stored.summary_plain_english,
      },
      flags: stored.flags,
      checkedClean: stored.checked_clean,
      redLines: stored.red_lines,
    },
    document.text,
    document.jurisdiction
  );

  return read.outcome === "read"
    ? { outcome: "read", result: read.result }
    : { outcome: "unreadable", problem: read.problem };
}

/**
 * The embedded reading on a document row.
 *
 * PostgREST returns an embedded resource as an object when it can see the relationship is
 * one-to-one and as a list when it cannot, and `document_readings.document_id` is unique,
 * so both shapes are legitimate answers to the same query. Handled here rather than
 * depended on either way.
 */
function embedded(row: Record<string, unknown>): Record<string, unknown> | null {
  const value = row.document_readings;
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return null;
}

function toSavedReading(stored: Record<string, unknown> | null): SavedReading | null {
  if (stored === null) return null;
  return {
    readAt: String(stored.read_at),
    marks: typeof stored.marks === "number" ? stored.marks : 0,
    redLines: Array.isArray(stored.red_lines) ? stored.red_lines.map(String) : [],
  };
}

/** Narrow one row into the shape the product uses, rather than passing columns around. */
function toStoredDocument(
  row: Record<string, unknown>,
  reading: SavedReading | null
): StoredDocument {
  return {
    id: String(row.id),
    name: String(row.name),
    format: row.format as DocumentFormat,
    text: String(row.extracted_text),
    sentences: Array.isArray(row.sentences) ? row.sentences.map(String) : [],
    jurisdiction: toJurisdiction(row),
    savedAt: String(row.created_at),
    reading,
  };
}

/**
 * The three columns back into the union (`docs/adr/0007`).
 *
 * The precedence is the one the analysis works to and the one the database was written
 * from: the Signer's own answer outranks the document's clause, the clause carries the
 * sentence it was read out of or it is not a detection, and neither of them means the
 * reading is left with nothing rather than with the United States.
 */
function toJurisdiction(row: Record<string, unknown>): Jurisdiction {
  const detectedName = asName(row.detected_jurisdiction);
  const detectedSentence = asName(row.detected_jurisdiction_sentence);
  const chosen = asName(row.chosen_jurisdiction);

  const detected =
    detectedName !== null && detectedSentence !== null
      ? { name: detectedName, sourceSentence: detectedSentence }
      : null;

  if (chosen !== null) return { source: "signer", name: chosen, detected };
  if (detected !== null) {
    return { source: "document", name: detected.name, sourceSentence: detected.sourceSentence };
  }
  return { source: "undetermined" };
}

function asName(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
