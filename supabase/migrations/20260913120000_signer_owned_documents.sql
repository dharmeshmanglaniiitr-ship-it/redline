-- Documents belong to one Signer, and the database is what enforces it.
--
-- Ticket 05. The isolation lives here as a row-level policy rather than as a filter in
-- application code, because a filter someone forgets to apply is a leak and a policy is
-- not. A Signer's contracts are confidential client work: no query made with another
-- account's credentials may return a row of them.
--
-- Only extracted text is stored, never the original file (CLAUDE.md). There is no bytea
-- column below, no base64 field and no reference to a storage bucket. The file is read in
-- the Signer's browser and stays on their machine; this table holds the words that came
-- out of it. tests/migrations.test.ts reads this file and fails if a later migration adds
-- a table without row level security, a policy that is not scoped to auth.uid(), or a
-- column that smuggles a file back in.

-- gen_random_uuid() is in core Postgres from 13 onward, so on Supabase this is already
-- true and the statement does nothing. It is here so the file can be run against an older
-- Postgres without the id default failing.
create extension if not exists pgcrypto;

-- Keeps updated_at honest without the application having to remember it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create table public.documents (
  id uuid primary key default gen_random_uuid(),

  -- The one Signer this document belongs to. Defaulted from the session so an insert
  -- cannot quietly omit it, and cascaded so closing an account takes its contracts with
  -- it rather than orphaning them.
  signer_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- What to call this document on screen, normally the file's own name.
  name text not null,

  -- Which parser produced the text. The values match DocumentFormat in
  -- lib/document/extraction.ts.
  format text not null,

  -- The document's text, normalized once by normalizeDocumentText() before it arrives.
  -- Every flag's source sentence is matched against this string by exact substring
  -- (docs/spec-v1.md), so it is stored character for character as it was matched.
  extracted_text text not null,

  -- extracted_text split the one way this repo defines a sentence, stored alongside it so
  -- a document saved today still cites the same sentences if the splitter changes later.
  sentences text[] not null,

  -- Jurisdiction, as ADR 0007 defines it.
  --
  -- Detection comes from the document's own governing-law clause and carries the sentence
  -- it came from, or it is not a detection. The Signer's explicit choice outranks
  -- detection and is kept beside it rather than overwriting it, because a governing-law
  -- clause naming a forum far from where the Signer works is a real feature of the deal
  -- they should still be able to see. Both null means undetermined, which is a state, not
  -- a missing value, and never becomes US.
  detected_jurisdiction text,
  detected_jurisdiction_sentence text,
  chosen_jurisdiction text,

  -- What the stored analysis actually assumed. ADR 0007 requires a stored analysis to
  -- record this or a returning Signer cannot tell what they were told. Generated rather
  -- than written, so it cannot drift from the two columns it follows. Null is
  -- undetermined.
  assumed_jurisdiction text generated always as (
    coalesce(chosen_jurisdiction, detected_jurisdiction)
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_name_present check (btrim(name) <> ''),
  constraint documents_format_known check (format in ('pdf', 'docx', 'text')),

  -- An unreadable document carries no text and is never saved. Nothing stored here may
  -- pretend to be a document Redline read, because an empty document that later reads as
  -- a clean contract is the worst failure this product has (docs/spec-v1.md).
  constraint documents_text_present check (btrim(extracted_text) <> ''),
  constraint documents_sentences_present check (
    coalesce(array_length(sentences, 1), 0) > 0
  ),

  -- ADR 0007: a jurisdiction without the sentence it came from is not a detection.
  constraint documents_detection_cites_its_sentence check (
    (detected_jurisdiction is null) = (detected_jurisdiction_sentence is null)
  ),
  constraint documents_chosen_jurisdiction_present check (
    chosen_jurisdiction is null or btrim(chosen_jurisdiction) <> ''
  )
);

comment on table public.documents is
  'Extracted contract text saved by one Signer. Never the original file.';

-- The library lists one Signer's own documents newest first, and every policy below
-- filters on signer_id, so the two go in one index.
create index documents_signer_id_created_at_idx
  on public.documents (signer_id, created_at desc);

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

alter table public.documents enable row level security;

-- One policy per command rather than a single permissive `for all`, so that widening one
-- of them later is a visible, deliberate edit to that command alone.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once per statement
-- instead of once per row.

create policy "Signers read only their own documents"
  on public.documents
  for select
  to authenticated
  using ((select auth.uid()) = signer_id);

create policy "Signers save documents only against themselves"
  on public.documents
  for insert
  to authenticated
  with check ((select auth.uid()) = signer_id);

-- `using` decides which rows may be updated, `with check` what they may become. Both are
-- needed: without the second, a Signer could hand their own row to another account.
create policy "Signers change only their own documents"
  on public.documents
  for update
  to authenticated
  using ((select auth.uid()) = signer_id)
  with check ((select auth.uid()) = signer_id);

create policy "Signers delete only their own documents"
  on public.documents
  for delete
  to authenticated
  using ((select auth.uid()) = signer_id);

-- A caller holding the publishable anon key with no session reaches nothing at all. The
-- policies above are already scoped to the authenticated role; the grant is withdrawn as
-- well so the refusal does not rest on one mechanism.
revoke all on table public.documents from anon;
