# 10. A saved reading is the record, and a re-reading never replaces it

## Decision
`docs/spec-v1.md` carries this as the last open question from the brief: story 28 assumes a
saved document shows the analysis as stored, stored analyses and current model output will
diverge as prompts change, and whether a returning Signer sees the stored analysis, a
re-run, or both was never decided. Ticket 15 is where it has to be. It is settled this way:

**The reading a document was saved with is stored in full, and opening the document shows
that reading.** Summary, every flag with its verified citation, its severity, its cost line
and its counter-offer, the cleared checklist, the standard it was marked against, and the
law it was read under. Opening a saved document makes no model call. Six months later, with
no API key on the deployment and the model unreachable, the Signer still sees exactly what
they were shown the day they decided.

**The record is immutable.** One document holds at most one reading — the one it was saved
with — and the database refuses to rewrite it. Not a convention: a unique constraint on
`document_id` and a `before update` trigger that raises, in
`supabase/migrations/20260914150000_saved_readings.sql`.

**A fresh reading is offered, on the Signer's word, and it is never written down.** The
saved sheet carries one action: read it again. What comes back is labelled as read just
now, sits in place of the record while they look at it, and one control puts the record
back. Nothing about the stored row changes, so a Signer who asks what Redline would say
today has not lost what it said in March.

**Which of the two is on the screen is always said** — in the masthead legend, in the
sheet's own state line, and to a screen reader. "Read on 14 March, kept as it stood" and
"Read again just now, not saved" are different sentences in the same place, so the question
"which am I looking at?" is answered before it is asked.

## Alternatives
- **Re-run on open, always.** The freshest answer, and the one that never goes stale.
  Rejected on the thing this product is for: a Signer opens a saved contract to check what
  they agreed to, and what they agreed to was argued out against a particular set of flags.
  A flag that has since stopped being raised does not un-happen. It would also put a model
  call and a wait behind every row of the library, fail entirely on a deployment with no
  model access, and — because the model is non-deterministic — quietly show two different
  answers on two consecutive opens with nothing said about either.
- **Stored only, with no way to ask again.** Simplest, and honest as far as it goes.
  Rejected because it leaves the divergence the spec named with no remedy at all: a Signer
  who has reason to think Redline reads a clause better now would have to paste the contract
  in again as a new document to find out, and would end up with two library rows for one
  deal. The text is already stored, so the cost of offering this is one button.
- **Re-run and overwrite the stored reading.** Keeps one row per document and the row always
  current. Rejected outright — it destroys the record. The one thing a library is for is
  being able to say what you were told, and a store that rewrites itself cannot.
- **Keep every reading as a history.** Defensible, and a natural extension. Rejected as
  outside the ticket: a Signer acted on one reading, and `CLAUDE.md` says to ask before
  building the obvious next step rather than building it.
- **Stamp each reading with a version of the analysis and warn when it is old.** The
  tempting one, because it would let the sheet say "this reading is two versions behind".
  Rejected because the marker would be a constant in code that somebody has to remember to
  change when a prompt changes, and a staleness warning that is not maintained is worse than
  none: it tells a Signer their reading is current when nobody checked. The date the reading
  was made is a fact the database knows and cannot get wrong, so that is what is shown.

## Why
The two failures the ticket names are not symmetrical. A Signer shown a re-run when they
expected the original has been shown something different from what they acted on, and they
have no way of noticing — the sheet looks the same either way. A Signer shown a stale stored
reading is reading something true: this is what Redline said on that date, which is the
question they came with. The second is a limitation with a date attached; the first is the
product misrepresenting its own history.

Storing the reading is also what makes the library worth having under `CLAUDE.md`'s own
rules. Every flag must cite the exact sentence it came from, and a stored flag's citation is
checked against the stored text on the way in and again on the way out
(`lib/analysis/reading.ts`), so a saved reading is exactly as checkable as the one on the
review screen. A library that kept only text would make a returning Signer re-run to
remember, which is what story 28 asks not to have to do.

## Consequences
- `public.document_readings` holds the reading, one row per saved document, under the same
  row-level security as `public.documents` and with the same `revoke all ... from anon`. It
  holds text, arrays of text and JSON — no column on it can carry a file, which
  `tests/migrations.test.ts` checks over the SQL itself.
- A document can be saved with no reading, and that stays a real state: the model is not set
  up on this deployment, or the analysis did not come back, and the Signer keeps the wording
  anyway. The library says so on the row rather than showing an empty report.
- `AnalysisResult.checkedClean` is branded, and a brand does not survive a database round
  trip. It is rebuilt on the way out by `clearedList`, from the stored entries and the
  stored flags, so an entry that a stored flag contradicts cannot come back clean however
  the row was written. That is the honest reconstruction, not a cast.
- A stored reading is validated before it is shown: clause types, severities, the
  `hedged === unstatedProperties.length > 0` invariant of ADR 0006, and every citation
  against the document's own stored text. A row that fails is reported as a reading that
  could not be read back, never as a shorter list of findings.
- The vocabulary in `lib/analysis/clauses.ts` is the vocabulary readings are stored in.
  Renaming a checklist entry would leave old readings naming something this codebase no
  longer has, and those entries would drop out of the cleared list they were saved in. A
  rename is therefore a data migration, not a rename.
- Nothing accumulates from the re-reading: it is state on a screen, and closing the tab ends
  it.
