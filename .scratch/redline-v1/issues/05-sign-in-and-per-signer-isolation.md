# 05: Sign-in and per-Signer document isolation

**What to build:** A Signer signs in, and the documents they have saved are theirs and
only theirs. A Signer's contracts are confidential client work; another account must not
be able to reach them under any query.

Isolation is enforced at the database with Supabase Row Level Security, not by filtering
in application code. The difference matters: a filter someone forgets to apply is a leak,
a row-level policy is not.

Only extracted text is stored — never the original file.

**Blocked by:** 01

**Status:** blocked on a database — 2026-09-13. Sign-in, session, storage of extracted
text and the full policy set are built; five of seven criteria are met. The two that
turn on row level security actually being enforced cannot be met without a Supabase
project, and are deliberately left unticked rather than claimed.

- [x] A Signer can sign in and sign out, and their session survives closing the tab
- [x] Extracted document text is stored against the signed-in Signer
- [ ] Row Level Security is enabled, and a second Signer's account cannot read the
      first's rows by any query
      — **written, not enabled.** The policies are in the migration and
      `tests/migrations.test.ts` asserts over them without a database, but no migration
      has been run anywhere yet, so row level security is not enabled on any database
      and the second half of this line is precisely what is unproven. Apply the
      migration, then run the isolation test below.
- [ ] A test proves the isolation by attempting cross-Signer reads and asserting they
      return nothing — not by asserting the UI hides them
      — **written but never run.** `tests/integration/signer-isolation.test.ts` makes the
      cross-Signer reads for real, but there is no Supabase project, no local Postgres and
      no Docker on the machine it was built on, so it skipped. It names the three missing
      variables and refuses to report green unrun. Isolation is **not** proven until it is
      run against a project with the migration applied. `tests/migrations.test.ts` asserts
      over the migration SQL without a database and is not a substitute.
- [x] No original uploaded file is stored anywhere
- [x] Supabase credentials live in the gitignored environment file
- [x] The Supabase dependency was asked about before being added (`CLAUDE.md`)
