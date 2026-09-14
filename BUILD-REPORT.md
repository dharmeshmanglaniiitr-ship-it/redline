# Build report — Redline v1

Autonomous build across the 18 tickets in `.scratch/redline-v1/issues/`, in dependency
order. Started 2026-09-13, finished 2026-09-14.

**Ticket `Status:` lines are the source of truth.** This file summarises them and records
the decisions made in your absence.

---

## Run these first

```bash
npm install
npx tsc --noEmit     # clean
npm test             # 367 passed | 31 skipped
npm run build        # 8 routes, / still statically prerendered
npm run smoke        # the fixture through the real pipeline, against the live model
```

`npm run smoke` is the one worth your attention. **The live model works now** — see below.

Then do the one thing this build could not do for you:

```bash
# apply both migrations to a scratch Supabase project, then:
export SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_ROLE_KEY=...
npm test             # turns the 31 skipped isolation assertions green
```

Until that runs, **per-Signer isolation is designed, not delivered.** Three tickets carry
an unticked criterion saying exactly that.

---

## The headline: the live model was reached

The previous run recorded every OpenRouter call returning HTTP 429 from the pinned
provider's shared pool, and every claim about live model behaviour in this build was
untested. **That is no longer true.** During ticket 18 the limit lifted, and
`npm run smoke` completed genuine end-to-end runs against the live model.

I ran it myself to confirm rather than taking it on report. What came back:

- The governing law was read out of the document's own clause 12.1 — England and Wales,
  carrying the sentence it came from.
- **7 flags, and 7 of 7 citations verified** by exact string match against the parsed
  document. On the subagent's run minutes earlier it was 8 of 8. The model is not
  deterministic about how many ordinary clauses it reports at severity 1; it was
  deterministic about quoting correctly.
- Severity came out of the derived properties in every case, with the properties printed
  beside each flag.

So the structured-output path — schema out, JSON back, `ResponseSchema.parse` accepting
it — is confirmed working against the real model, which is the one thing the whole
previous run could not confirm. The provider pin, the environment-read model id, the
reasoning effort and the JSON schema are all unchanged from your instruction; nothing was
routed around.

**What is still untested live:** the Q&A refusal path, the checklist examination and the
summary under a real model. Smoke covers detection, flags, severity and citations.

---

## Status

| # | Ticket | Status |
|---|--------|--------|
| 01 | Project scaffold and first deploy | done |
| 02 | Settle the hedging trigger | done — ADR 0006 |
| 03 | Settle how jurisdiction is determined | done — ADR 0007 |
| 04 | Browser text extraction | done |
| 05 | Sign-in and per-Signer isolation | **5/7 — blocked on a database** |
| 06 | Fixture corpus and test harness | done |
| 07 | Analysis seam — plain-English summary | done |
| 08 | Risk flags — verified citations, derived severity | done — one criterion qualified |
| 09 | The checked-clean list | done |
| 10 | Settle remaining checklist thresholds | done — ADR 0008 |
| 11 | Counter-offers | done — sendability part-reviewed |
| 12 | Document Q&A with refusal | done |
| 13 | Red lines as analysis input | done — ADR 0009; **isolation unticked** |
| 14 | Jurisdiction as explicit input | done |
| 15 | The library | done — ADR 0010; **isolation unticked** |
| 16 | Not-a-lawyer positioning pass | done — one residual |
| 17 | The landing page | done before this run — **one criterion open** |
| 18 | Real analysis output on the landing page | done |

Every ticket is done except **05**, which is blocked on a Supabase project that does not
exist. Nothing was blocked twice; nothing was worked around.

### The criteria left open, and why

Each is unticked deliberately. A fake green would have been worse than any of them.

1. **05 — RLS enabled, second Signer cannot read the first's rows.** Written, never run.
2. **05 — the cross-Signer read test.** Real and complete; skips without a database.
3. **13 — red lines covered by per-Signer isolation.** Same cause.
4. **15 — library covered by per-Signer isolation.** Same cause.
5. **13 — red lines persist across documents and sessions** (marked partial). The table,
   the policies and the read/write path exist, and the app degrades to no red lines when
   there is no project, no session or a failed query. But persistence has never happened.
6. **08 — the paired fixtures produce materially different severities** (marked partial).
   Two of three pairs do, 1 against 3 in both. The third *cannot*: its halves differ only
   in whether the contract states the restriction is unpaid, and ADR 0006 requires an
   unstated property to be read at its dangerous end. A severity gap there would mean a
   hedge had lowered a finding, which the ADR forbids. That pair is asserted to differ in
   its hedge and `unstatedProperties` instead. **This is the analysis being right, not a
   gap.**
7. **11 — counter-offers read as sendable** (marked partial). The mechanical half is
   asserted. For the prose half I read two of the eighteen drafted messages end to end and
   both are sendable as they stand; ticket 16's agent then read all eighteen for
   positioning. Nobody has read all eighteen purely for prose quality.

Plus **17's** open criterion, inherited: the landing page has never been seen at a real
390px viewport. Chrome refused every window resize in this environment. Ticket 18 put more
document text on that page than the illustration carried, so the reflow at phone width is
now more worth a real look than it was. **Do not assume mobile was checked.**

---

## Decisions made in your absence

Earlier decisions D1–D18 from the first run stand and are unchanged: model access
configured not hard-coded, Supabase written but not run, Vitest as the runner, the
fixture-derived stub, `pdfjs-dist` + `mammoth`, the hedging trigger, jurisdiction
determination, severity as an integer 1–4, `/review` under an `(app)` route group, paste
and file as equals, the unreadable state as a type error, the Supabase client choice, and
`AnalysisResult` as the shape later tickets inherit. What follows is this run.

### D19 — Counter-offer wording is written in code, not asked of the model

`lib/analysis/counter-offer.ts` drafts the redraft for all eight clause types at both ends
of each threshold, reading the contract's own defined terms and clause numbers.

Reasoning, and the second is the one that decided it. Copy a Signer *sends under their own
name* has to go through the humanizer before it ships, and prose invented per request has
not. And had the wording come from the model, then in the suite it would come from the
stub — so every sendability assertion would have been a test of the stub, which is the
disqualifier in your own step 5.

It is not a fixed string: it reads which properties fired, adapts to the document's party
labels, and has a separate additive arm for clauses that *protect* the Signer, where
"replace this" would have asked the Sender to delete their own protection.

**This is the decision in this run most worth revisiting.** It trades model flexibility for
reviewability. If you want model-drafted redrafts, the seam is there to hang them on — but
you lose the humanizer guarantee and the tests get weaker.

### D20 — A red line moves the ranking, not the severity (ADR 0009)

The ticket said red lines change "severity and ranking". I built ranking only, and recorded
why in an ADR rather than doing it silently.

Severity answers *what does this wording do*; a red line answers *what will I not sign*.
Folding the second into the first makes "severity, 3 of 4" mean different things on two
people's screens, and costs severity the defensibility ADR 0003 exists to give it. So the
order moves, and a new `redLinesCrossed` field carries the reason with the Signer's own
sentence quoted. ADR 0007's severity-invariance assertions survived untouched; nothing was
loosened.

The case this buys, which a re-weighting gets wrong and a filter cannot express: a
three-month, paid, ten-mile restriction stays severity 1 — PRD §5 is explicit that marking
it higher cries wolf — and still sits first for someone whose note reads "I do not sign
non-competes."

### D21 — A saved reading is the record (ADR 0010)

The spec carried this open. Decided: the saved reading is what a returning Signer sees,
stored whole, shown with no model call, immutable at the database level. A fresh reading is
offered beside it, labelled as made just now, and never written down. Which one is on
screen is stated in three places.

A version stamp marking readings stale was the tempting alternative and is rejected in the
ADR: a marker nobody maintains will tell a Signer their reading is current when nobody
checked. The date the database already knows cannot lie that way.

### D22 — The landing page's sample is stub-derived, and says so

`app/page.tsx` shows output from the real `analyze()` seam over a corpus fixture, generated
ahead of time and committed as data, with a test that fails if the committed file drifts
from what the analysis produces today.

The artifact is built from the fixture stub, not the live model, because the drift test has
to reproduce it offline with no key. The page states that in as many words rather than
implying a live model wrote it, and `producedBy` is a single-arm union so a live
regeneration would need new copy rather than a quiet swap.

Now that the live model is reachable, regenerating from it is a real option — but you would
be trading the drift test for it. I left the reproducible version in place.

### D23 — The four remaining clause thresholds, and how thin their evidence is (ADR 0008)

One-sided indemnity, uncapped liability, auto-renewal and unilateral change all now have
thresholds expressed as checkable properties of wording, because the checked-clean list is
not a real claim while a checklist entry cannot be flagged.

Evidence strength is recorded **per clause** rather than as a blanket caveat, because the
four differ enormously. The case worth reading: auto-renewal is the best-evidenced clause
danger in the whole research and it ranks **2**, because that evidence is consumer
subscriptions, not freelance retainers. Evidence volume answers whether a clause matters to
a population, not what one instance costs this Signer. Letting the complaint count set the
rank is the specific mistake that evidence invites.

Uncapped liability is marked weakest — PRD §8 says no sourced individual complaint exists —
and the six-month / thirty-day numbers are labelled calibrations with nothing behind them,
pinned by a test so changing one is deliberate.

### D24 — The Q&A seam checks position, not only citation

Found during ticket 16 and fixed there. `lib/analysis/answer.ts` claimed in its own
docstring that "the prompt asks; the seam enforces", but the seam only ever verified the
quote. An answer reading "a court would find this unenforceable" reached a Signer
unchallenged as long as it cited a real sentence — a citation check cannot see that the
paragraph beside it has nothing to do with the sentence.

That is the DoNotPay failure mode, on the feature nearest that line. Now checked at the
seam, with the document's own words excised first so a contract containing "unenforceable"
in its severability clause does not trip it.

### D25 — Two defects I fixed during verification rather than passing on

- **A literal NUL byte** in `lib/analysis/analyze.ts`, used as a dedupe key separator. It
  made the file register as binary to git and grep, silently losing diffability — the
  problem commit `e01d12e` had already settled for this repo. Rewritten as an escape.
- **Three ticket status lines** claiming work was uncommitted after I had committed it, and
  two criteria ticked more confidently than the evidence supported (13's persistence, 11's
  sendability). Both downgraded to partial with the reason written in.

---

## What could not be verified

- **Row Level Security, on all three tables.** No Supabase project exists. The policies in
  `supabase/migrations/` are written with full rigour — RLS enabled, four separate policies
  per table each scoped to `auth.uid()`, `anon` revoked, `authenticated` named explicitly,
  cascade to `auth.users`, no column that could hold a file, and a Postgres `check` that
  makes a stored finding without a source sentence unwritable. `tests/migrations.test.ts`
  asserts all of that over the actual SQL and was verified to bite by introducing a
  deliberately bad migration. **None of it has run.**
  `tests/integration/signer-isolation.test.ts` makes real cross-Signer reads, updates,
  deletes and inserts across all three tables and skips with a stderr banner naming the
  three missing variables. It cannot report green unrun.
- **The live Q&A refusal, checklist and summary paths.** Smoke exercises detection, flags,
  severity and citations against the live model. The other three seams are exercised
  against the fixture stub only.
- **Any viewport.** No browser was opened in this run. The 390px gap DESIGN.md records is
  unchanged, and slightly wider after ticket 18.
- **`summary.plainEnglish` positioning.** Ticket 16's one residual. It is model prose whose
  only guard is a prompt rule, because the three analysis calls run under `Promise.all` and
  refusing a summary would take the flags and checklist down with it. It is the one
  Signer-facing surface that is neither sentence-cited nor seam-checked. That was true
  before this run too.

---

## Where the guarantees actually live

Worth knowing, because several are enforced by the compiler rather than by discipline, so a
future change will fail to build rather than fail quietly:

- A flag without its source sentence is unrepresentable — `sourceSentence` is required.
- A refusal cannot carry a citation — the refused arm has no such field, and an
  `@ts-expect-error` in the suite makes `tsc` the enforcer.
- A flagged entry cannot be reported clean — `ClearedChecklist` is branded and
  `clearedList`, which reads the flags, is its only constructor. Across a database round
  trip it is *rebuilt* rather than re-asserted.
- An unreadable document cannot be analysed — the unreadable arm carries no `text` field.
- A hedge can only name a property its clause type's severity function consumes —
  `unstatedProperties` is typed to that clause type.
- Adding a clause type without handling it everywhere does not compile — three exhaustive
  switches proved this during ticket 10.
