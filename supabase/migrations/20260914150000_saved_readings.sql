-- What Redline said about a saved document, kept as the record of what the Signer read.
--
-- Ticket 15, and docs/adr/0010 is the decision behind it: a saved document shows the
-- reading it was saved with, and opening it makes no model call. So the reading has to be
-- here in full — the summary, every flag with the sentence it cites, the checklist that
-- came back clean, and the standard it was marked against — because a library that kept
-- only the text would make a Signer re-run an analysis to remember what it said, which is
-- the one thing user story 28 asks not to have to do.
--
-- Three things this table is built around.
--
-- **It is a record, and a record is not rewritten.** One reading per document, enforced by
-- a unique constraint, and an update to one raises. A Signer who asks what Redline would
-- say today gets a fresh reading on the screen; nothing about the row they acted on moves
-- (docs/adr/0010).
--
-- **Every flag cites its source** (docs/adr/0001). A stored flag with no sentence to point
-- at cannot be written at all, which is what every_flag_cites_its_source() below is for.
-- The application checks it again on the way out, against the document's own stored text,
-- because a quote only counts if it is still a sentence of the thing it quotes.
--
-- **Only extracted text is stored, never the original file** (CLAUDE.md). Nothing below is
-- a file: text, arrays of text, one jsonb column holding the findings, and no bytea, no
-- base64 and no bucket key anywhere. tests/migrations.test.ts reads this file and fails if
-- a later edit adds a table without row level security, a policy not scoped to auth.uid(),
-- or a column that could carry a file.
--
-- public.touch_updated_at() is not used here. There is no updated_at, because there is no
-- update.

-- Whether every finding in a stored reading quotes the sentence it came from.
--
-- A check constraint may not contain a subquery, so the walk over the array lives in an
-- immutable function and the constraint calls it. It is deliberately narrow: it says
-- nothing about whether the quote is *true of* the document, which needs the document's
-- text and the same sentence splitter the analysis used, and is done in
-- lib/analysis/reading.ts. What it settles here is that a finding with nothing to point at
-- never reaches the table, whoever is writing the row.
create or replace function public.every_flag_cites_its_source(flags jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(flags) = 'array'
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(flags) as each_flag(flag)
      where pg_catalog.jsonb_typeof(flag) <> 'object'
         or pg_catalog.btrim(coalesce(flag ->> 'sourceSentence', '')) = ''
         or pg_catalog.btrim(coalesce(flag ->> 'clauseType', '')) = ''
    );
$$;

comment on function public.every_flag_cites_its_source(jsonb) is
  'ADR 0001, as a constraint: a stored finding with no source sentence is not a finding.';

-- A saved reading may not be rewritten. It is the record of what a Signer was shown on the
-- day they decided, and a store that rewrites itself cannot answer the one question a
-- library exists to answer (docs/adr/0010).
create or replace function public.refuse_to_rewrite_a_reading()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception
    'a saved reading is the record of what the Signer was shown and is never rewritten'
    using errcode = 'restrict_violation';
end;
$$;

create table public.document_readings (
  id uuid primary key default gen_random_uuid(),

  -- The document this is the reading of. One reading per document — the one it was saved
  -- with — and it goes when the document goes.
  document_id uuid not null unique
    references public.documents (id) on delete cascade,

  -- The Signer this reading belongs to. Defaulted from the session so an insert cannot
  -- quietly omit it, and cascaded so closing an account takes the readings with it.
  -- Carried here as well as on public.documents rather than reached through the join,
  -- because the policies below have to be able to decide this row on its own terms.
  signer_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- The plain-English account of what signing would commit the Signer to, as three fields
  -- rather than one blob: who sent it, what it covers, and what it commits them to. The
  -- first two are what a Signer checks to be sure they have the right document
  -- (docs/spec-v1.md, user story 5).
  summary_sender text not null,
  summary_engagement text not null,
  summary_plain_english text not null,

  -- The findings, worst first as the reading ranked them, each carrying its verified
  -- citation, its severity, what it would cost, the wording to send back, and the Signer's
  -- own lines it met. Held as one document rather than as columns because a finding's
  -- severity-determining properties differ per clause type (lib/analysis/clauses.ts), and
  -- a table of columns would either flatten that or grow one column per clause type.
  -- lib/analysis/reading.ts is what reads it back, and it refuses anything it cannot
  -- establish rather than drawing a partial reading.
  flags jsonb not null default '[]'::jsonb,

  -- The checklist entries examined that came back with nothing to report (docs/adr/0004).
  -- Stored as the names, in the vocabulary of the day: renaming one in
  -- lib/analysis/clauses.ts leaves old readings naming something the codebase no longer
  -- has, so a rename is a data migration (docs/adr/0010).
  checked_clean text[] not null default '{}',

  -- The Signer's own red lines as they stood when this was read, verbatim (docs/adr/0009).
  -- Copied rather than joined to public.red_lines on purpose: a standard is edited, and a
  -- reading has to keep the one it was actually made against, not whatever the Signer
  -- refuses today.
  red_lines text[] not null default '{}',

  -- How many terms carry a mark, so the library can say so on a row without reading every
  -- finding of every document. Generated rather than written, so it cannot disagree with
  -- the list it counts.
  marks integer generated always as (jsonb_array_length(flags)) stored,

  -- When the reading was made. This is what the sheet shows a Signer coming back, and it
  -- is the only staleness signal this product has: a version stamp nobody remembers to
  -- change would tell them their reading is current when nobody checked (docs/adr/0010).
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- A reading that says nothing about the document would draw as a contract that commits
  -- the Signer to nothing, which is the most dangerous thing this product could show
  -- (docs/spec-v1.md).
  constraint document_readings_summary_present check (btrim(summary_plain_english) <> ''),

  -- docs/adr/0001, made structural. A finding Redline cannot show the source of is not a
  -- finding, and this table will not hold one.
  constraint document_readings_flags_cite_their_source check (
    public.every_flag_cites_its_source(flags)
  )
);

comment on table public.document_readings is
  'What Redline said about one saved document, as it stood when the Signer kept it.';

-- The library lists one Signer's readings alongside their documents, and every policy
-- below filters on signer_id.
create index document_readings_signer_id_read_at_idx
  on public.document_readings (signer_id, read_at desc);

create trigger document_readings_are_never_rewritten
  before update on public.document_readings
  for each row execute function public.refuse_to_rewrite_a_reading();

alter table public.document_readings enable row level security;

-- One policy per command rather than a single permissive `for all`, so that widening one
-- of them later is a visible, deliberate edit to that command alone.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once per statement
-- instead of once per row.

create policy "Signers read only their own readings"
  on public.document_readings
  for select
  to authenticated
  using ((select auth.uid()) = signer_id);

-- Two conditions, because there are two ways to own something here. The row has to belong
-- to the session, like every other row in this schema. And the document it is a reading of
-- has to be one this session can see: the `exists` runs under the caller, so it is filtered
-- by public.documents' own select policy, which means a Signer cannot hang a reading on
-- somebody else's contract by guessing its id.
create policy "Signers save readings only against their own documents"
  on public.document_readings
  for insert
  to authenticated
  with check (
    (select auth.uid()) = signer_id
    and exists (
      select 1 from public.documents as owned where owned.id = document_id
    )
  );

-- Scoped like the others, and it reaches nothing: the trigger above raises on every update
-- to this table, whoever makes it. The policy is written anyway so that a reading is never
-- silently governed by a missing rule — if the record is ever made editable, widening it is
-- a deliberate edit to the trigger and this clause together, not a gap somebody finds.
create policy "Signers change only their own readings"
  on public.document_readings
  for update
  to authenticated
  using ((select auth.uid()) = signer_id)
  with check ((select auth.uid()) = signer_id);

-- Deleting is allowed, because a Signer may drop a document and the reading goes with it
-- through the cascade, and because their own record is theirs to destroy.
create policy "Signers delete only their own readings"
  on public.document_readings
  for delete
  to authenticated
  using ((select auth.uid()) = signer_id);

-- A caller holding the publishable anon key with no session reaches nothing at all. The
-- policies above are already scoped to the authenticated role; the grant is withdrawn as
-- well so the refusal does not rest on one mechanism.
revoke all on table public.document_readings from anon;
