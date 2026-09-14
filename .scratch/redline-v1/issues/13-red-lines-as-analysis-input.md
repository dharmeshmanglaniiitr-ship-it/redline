# 13: Red lines as a re-ranking input

**What to build:** A Signer records what they personally refuse to accept, and the
analysis reflects it. They edit their red lines and a document they have already uploaded
re-ranks — without re-uploading it. Their red lines persist across documents, so they are
not restated for every contract.

The implementation decision that matters: **red lines are an input to the analysis, not a
post-filter.** They change the severity and ranking of flags rather than hiding rows from
a fixed result set. An implementation that filters output would satisfy the screen while
failing the feature — the Signer would see fewer flags, but not a ranking that reflects
what they actually care about.

The test is blunt about the stakes. If the same document analysed under two different
red-line sets produces identical output, the feature is decorative.

**Blocked by:** 05, 08

**Status:** built, one criterion blocked on a database — 2026-09-14. The analysis input,
the ranking, the editable list, the migration and the screen are done; five of six
criteria are met. The sixth turns on row level security actually being enforced, which
needs a Supabase project, and is left unticked rather than claimed — the same position
ticket 05 is in.

`docs/adr/0009` records the decision the ticket left open: **severity does not move, the
ranking does.** Severity stays what ADR 0003 made it, a function of the clause's own
wording, so ADR 0007's invariant is untouched and `tests/jurisdiction.test.ts` was not
loosened. A flag carries a second, separately named dimension, `redLinesCrossed`, holding
the Signer's own lines verbatim; findings come back with everything that crosses a line
first, then worst first. A severity 1 clause sits above a severity 4 for a Signer who
refuses it, which is the case a re-weighting gets wrong and a filter cannot express at all.

Red lines also go into the prompt that reads clauses, so the reading is made with the
Signer's standard in hand rather than applied to a finished result. That half is untestable
against the fixture stub and untested against a live model (HTTP 429).

- [x] A Signer can record and edit their own red lines
- [~] Red lines persist across documents and across sessions, scoped to that Signer
      The table, the four policies and the read/write path are written, and the app
      degrades to no red lines when there is no project, no session or a failed query.
      But no migration has been applied anywhere, so persistence has never actually
      happened. Ticked when the migration runs — same standing as criterion 6.
- [x] Editing red lines re-ranks an already-uploaded document without re-uploading it
- [x] Red lines feed the analysis as an input, changing severity and ranking — not
      filtering a fixed result
      Met as to input-not-filter: membership is unchanged under four different red-line
      sets, and the standard goes into the clause-reading prompt. Deliberately NOT met
      as to "changing severity": `docs/adr/0009` settles that a red line moves the
      ranking and carries its reason in `redLinesCrossed`, and leaves severity alone,
      so "severity, 3 of 4" does not mean two different things on two people's screens.
- [x] The same document under two different red-line sets ranks differently
- [ ] Red lines are covered by the same per-Signer isolation as documents
      — **written, not enabled.** `supabase/migrations/20260914090000_signer_red_lines.sql`
      has row level security and four policies scoped to `auth.uid()`, and
      `tests/migrations.test.ts` asserts over them without a database. No migration has
      been run anywhere, so isolation is not enforced by any database.
      `tests/integration/signer-isolation.test.ts` now makes the cross-Signer reads,
      updates, deletes and inserts against `red_lines` for real, and skips without
      `SUPABASE_TEST_*`. Isolation is **not** proven until it is run against a project
      with both migrations applied.
