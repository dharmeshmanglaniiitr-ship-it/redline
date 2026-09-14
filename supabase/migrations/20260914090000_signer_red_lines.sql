-- A Signer's red lines: the standard their documents are marked against.
--
-- Ticket 13. A red line is the Signer saying, in their own words, what they will not
-- accept. It is theirs and nobody else's — more personal than a contract, because it says
-- what they refuse rather than what somebody asked of them — so the isolation is the same
-- as documents': a row-level policy scoped to auth.uid(), not a filter in application
-- code. Every policy below is written against the current session's own account, one per
-- command, so widening any of them later is a visible edit to that command alone.
--
-- Nothing here holds a file, and nothing here holds a document. A red line is one line of
-- the Signer's own text; what it gets applied to lives in public.documents.
-- tests/migrations.test.ts reads this file and fails if it adds a table without row level
-- security, a policy not scoped to auth.uid(), or a column that could carry a file.

-- public.touch_updated_at() is defined by 20260913120000_signer_owned_documents.sql, which
-- runs before this one. It is reused rather than redefined so both tables keep the same
-- clock.

create table public.red_lines (
  id uuid primary key default gen_random_uuid(),

  -- The Signer whose standard this is. Defaulted from the session so an insert cannot
  -- quietly omit it, and cascaded so closing an account takes the standard with it.
  signer_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  -- The line itself, in the Signer's own words, kept character for character. The
  -- analysis quotes it straight back at them beside the clause it meets
  -- (docs/adr/0009), so nothing tidies it on the way in or on the way out.
  wording text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An empty line is not a standard. It would match every clause or none depending on how
  -- the matcher was written, and either way it is not something a Signer meant to say.
  constraint red_lines_wording_present check (btrim(wording) <> ''),

  -- One line, not a pasted contract. The cap is generous for a sentence and small enough
  -- that this column cannot become a second place documents are kept.
  constraint red_lines_wording_is_one_line check (length(wording) <= 300)
);

comment on table public.red_lines is
  'What one Signer refuses to accept, in their own words. Their marking standard.';

-- The same line written twice is one line, and a Signer editing their standard should not
-- have to notice they already said it. Compared without case or surrounding space, because
-- those are not what makes two lines different.
create unique index red_lines_one_of_each_per_signer
  on public.red_lines (signer_id, lower(btrim(wording)));

-- The standing list is read in the order it was written, per Signer, and every policy
-- below filters on signer_id, so the two go in one index.
create index red_lines_signer_id_created_at_idx
  on public.red_lines (signer_id, created_at);

create trigger red_lines_touch_updated_at
  before update on public.red_lines
  for each row execute function public.touch_updated_at();

alter table public.red_lines enable row level security;

-- One policy per command rather than a single permissive `for all`, so that widening one
-- of them later is a visible, deliberate edit to that command alone.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once per statement
-- instead of once per row.

create policy "Signers read only their own red lines"
  on public.red_lines
  for select
  to authenticated
  using ((select auth.uid()) = signer_id);

create policy "Signers record red lines only against themselves"
  on public.red_lines
  for insert
  to authenticated
  with check ((select auth.uid()) = signer_id);

-- `using` decides which rows may be changed, `with check` what they may become. Both are
-- needed: without the second, a Signer could rewrite their own line into another account's
-- standard, which is worse than reading one — it decides what somebody else gets told.
create policy "Signers change only their own red lines"
  on public.red_lines
  for update
  to authenticated
  using ((select auth.uid()) = signer_id)
  with check ((select auth.uid()) = signer_id);

create policy "Signers delete only their own red lines"
  on public.red_lines
  for delete
  to authenticated
  using ((select auth.uid()) = signer_id);

-- A caller holding the publishable anon key with no session reaches nothing at all. The
-- policies above are already scoped to the authenticated role; the grant is withdrawn as
-- well so the refusal does not rest on one mechanism.
revoke all on table public.red_lines from anon;
