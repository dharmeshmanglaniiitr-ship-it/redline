# 05: Sign-in and per-Signer document isolation

**What to build:** A Signer signs in, and the documents they have saved are theirs and
only theirs. A Signer's contracts are confidential client work; another account must not
be able to reach them under any query.

Isolation is enforced at the database with Supabase Row Level Security, not by filtering
in application code. The difference matters: a filter someone forgets to apply is a leak,
a row-level policy is not.

Only extracted text is stored — never the original file.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A Signer can sign in and sign out, and their session survives closing the tab
- [ ] Extracted document text is stored against the signed-in Signer
- [ ] Row Level Security is enabled, and a second Signer's account cannot read the
      first's rows by any query
- [ ] A test proves the isolation by attempting cross-Signer reads and asserting they
      return nothing — not by asserting the UI hides them
- [ ] No original uploaded file is stored anywhere
- [ ] Supabase credentials live in the gitignored environment file
- [ ] The Supabase dependency was asked about before being added (`CLAUDE.md`)
