# 15: The library

**What to build:** A Signer's past documents stay. They can come back months later and
check what they agreed to, and opening a saved document shows them what the analysis said
rather than making them re-run it to remember.

Only extracted text is stored, never the original file. Everything here is covered by the
per-Signer isolation established in ticket 05 — a Signer's library is theirs alone.

**One thing to settle before building.** The spec carries this as an open question: stored
analyses and current model output will diverge as prompts change. Whether a returning
Signer sees the stored analysis, a fresh re-run, or both is not decided. Decide it as part
of this ticket rather than defaulting into one silently — a Signer who sees a re-run when
they expected the original has been shown something different from what they acted on,
and a Signer who sees a stale stored analysis may be reading conclusions the current
system would no longer draw.

**Blocked by:** 05, 08

**Status:** built, one criterion blocked on a database — 2026-09-14. The stored reading,
its migration, the list, the saved sheet and the decision are done; four of five criteria
are met. The fifth turns on row level security actually being enforced, which needs a
Supabase project, and is left unticked rather than claimed — the same position tickets 05
and 13 are in.

`docs/adr/0010` records the decision the ticket left open: **the reading a document was
saved with is the record, and a re-reading never replaces it.** The analysis is stored in
full beside the text, so opening a saved document makes no model call and works on a
deployment whose model is unreachable. The record is immutable: one reading per document,
and a trigger that refuses every update to it. A fresh reading is offered on the saved
sheet, labelled as made just now, and is never written down. Which of the two is on the
screen is said in the masthead, under the head, and in the live region.

The brand on `checkedClean` cannot cross a database, so it is rebuilt on the way out by
`clearedList` from the stored entries and the stored flags — an entry a stored flag
contradicts cannot come back clean however the row was written. Every stored citation is
checked against the document's own stored text on the way in and again on the way out, and
a reading that does not hold up is reported as one that could not be read back, never as a
shorter list of findings.

- [x] A Signer sees a list of the documents they have analysed
- [x] Opening a saved document shows its analysis without requiring a re-run
      `tests/library.test.ts` renders the real saved sheet from a stored reading with no
      model gateway anywhere in the test.
- [x] Only extracted text is stored; no original file is retained
      Structural three times over: `saveDocument` takes the one arm of `ExtractionResult`
      that carries text, the new migration has no binary, base64 or bucket column, and
      `tests/migrations.test.ts` fails any migration that adds one.
- [ ] The library is covered by per-Signer Row Level Security, verified by a
      cross-Signer read test
      — **written, not proven.** `public.document_readings` has row level security, four
      policies scoped to `auth.uid()`, an insert policy that also requires the document to
      be one the session can see, and `revoke all ... from anon`.
      `tests/integration/signer-isolation.test.ts` now makes the cross-Signer reads,
      updates, deletes and inserts against the readings table for real — and skips,
      because there is no Supabase project and no migration has been applied anywhere.
      `tests/migrations.test.ts` asserts over the SQL without a database and is not a
      substitute.
- [x] The stored-versus-re-run question is explicitly decided, and the Signer can tell
      which they are looking at
      `docs/adr/0010`, and the "Which reading this is" block on the saved sheet.
