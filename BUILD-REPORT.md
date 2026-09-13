# Build report — Redline v1

Autonomous build run, started 2026-09-13. Orchestrated across subagents against the 18
tickets in `.scratch/redline-v1/issues/`, in dependency order.

This file is written as the build runs, so if the run dies partway it still records what
was decided and why. **Ticket `Status:` lines are the source of truth for progress** —
this file summarises them.

---

## How to pick this up (read this first)

```bash
npm install          # vitest and the test harness are new since your last session
npx tsc --noEmit     # typecheck
npm test             # full suite
npm run build        # production build
npm run smoke        # fixture contract through the real pipeline, prints flags + sources
```

Then read **Decisions made in your absence** below, because several of them settle things
the repo previously recorded as open, and you may disagree with them.

---

## Status

Filled in as tickets complete. See each ticket's own `Status:` line for detail.

| # | Ticket | Status |
|---|--------|--------|
| 01 | Project scaffold and first deploy | done |
| 02 | Settle the hedging trigger | done — ADR 0006 |
| 03 | Settle how jurisdiction is determined | done — ADR 0007 |
| 04 | Browser text extraction | done |
| 05 | Sign-in and per-Signer isolation | 5/7 — blocked on a database |
| 06 | Fixture corpus and test harness | done |
| 07 | Analysis seam — plain-English summary | done (live model unreached) |
| 08 | Risk flags — verified citations, derived severity | pending |
| 09 | The checked-clean list | pending |
| 10 | Settle remaining checklist thresholds | pending |
| 11 | Counter-offers | pending |
| 12 | Document Q&A with refusal | pending |
| 13 | Red lines as analysis input | pending |
| 14 | Jurisdiction as explicit input | pending |
| 15 | The library | pending |
| 16 | Not-a-lawyer positioning pass | pending |
| 17 | The landing page | done before this run |
| 18 | Real analysis output on the landing page | pending |

---

## Decisions made in your absence

You said to decide rather than ask, and to record the reason. Each of these is a real
fork where I picked a branch.

### D1 — Model access is configured, not hard-coded

Per your instruction: OpenRouter's OpenAI-compatible endpoint, `OPENROUTER_MODEL` read
from the environment, provider pinned to `fireworks` with `allow_fallbacks: false` and
`require_parameters: true`, reasoning effort `low`, structured JSON output on every
analysis and answer call. No model id appears in source. This is recorded here because
`CLAUDE.md` told me to stop and ask about it, and you pre-answered it.

### D2 — Supabase is written but not run

No Supabase project exists. Every table and policy is a SQL migration under
`supabase/migrations/` for you to run by hand. The app boots and analyses a pasted
document with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` absent;
only the library and red lines require an account. Auth is never mocked in the product.
Consequence: **every row-level-security claim in this build is unverified.** Nothing
here proves isolation works; it proves the policy SQL says it should.

### D3 — Test runner is Vitest

`CLAUDE.md` says ask before adding a dependency. Vitest: runs in Node with no browser and
no network, native TypeScript and ESM, and the watch/single-file ergonomics the ticket
asks for. Jest needs more configuration to reach the same place on an ESM TypeScript
Next.js 16 codebase. Recorded because it is a dependency I added without asking.

### D4 — The model client is stubbed in tests, from the fixture sidecars

The suite runs with no API key. The stub returns payloads built from the fixture sidecar
JSON, so tests exercise real parsing, real citation verification and real severity
derivation over known input. What this does *not* test is whether the live model produces
good analysis — that is what `npm run smoke` is for.

### D8 — Vitest 4, not 5, and what that costs you

`vitest@5` peers `@types/node@^22 || >=24`; this repo pins `@types/node@^20`, so npm
refuses it. Vitest 4.1.11 installs clean against the existing pin, so I took 4 rather
than bump `@types/node` across the whole repo inside a ticket that was only meant to add
a test runner. Worth knowing: the local runtime is Node v24.19.0 being typechecked
against types for Node 20, which was already true before this run. If you want Vitest 5,
bump `@types/node` first and expect the typecheck surface to move.

The config is `vitest.config.mts`, not `.ts`. As `.ts` it printed a CommonJS/ESM
forward-compatibility warning on every run, and a warning that always fires is one
everyone learns to scroll past. The `.mts` extension is what the in-repo Next.js 16
guide recommends anyway. The alternative, `"type": "module"` in `package.json`, would
have changed module resolution for `next.config.ts` and PostCSS too.

### D5 — Browser parsing uses `pdfjs-dist` and `mammoth`

Ticket 04 has an acceptance criterion that the parsing dependency "was asked about before
being added", which `CLAUDE.md` also requires. You were not here, so I chose:

- **`pdfjs-dist`** for PDF. It is Mozilla's own PDF engine, runs entirely in the browser,
  and does text-layer extraction only — it does no OCR, which is exactly right here.
  A PDF with no text layer returns no text, which is the signal the unreadable state
  needs rather than a problem to work around.
- **`mammoth`** for `.docx`, which is the format freelance contracts actually arrive in.
- Plain text and pasted text need no dependency.

Both run client-side, so the original file never leaves the machine — the constraint in
`CLAUDE.md` and story 2. If you want the surface narrower, dropping `mammoth` costs
`.docx` support and nothing else.

### D6 — Hedging trigger (ticket 02), settled

Redline hedges a finding **if and only if** at least one property its severity function
consumed was not stated in the document. Recorded in full as `docs/adr/0006`.

The reason for this shape: ADR 0003 already makes severity a function of named, extracted
clause properties, so "is a property missing?" is a fact about the analysis rather than a
feeling about the output. That makes `hedged === (unstatedProperties.length > 0)` a unit
test. A trigger resting on the model's self-reported confidence would not have been
checkable, which is what the ticket forbids.

Three bounds stop it drifting into a default hedge: a hedge must name the missing
property, a hedge never lowers severity or suppresses a flag, and hedging is per-finding
rather than a document-level banner.

### D7 — Jurisdiction determination (ticket 03), settled

Detected from the document's own governing-law clause, carrying that sentence as evidence;
overridden by the Signer whenever they say otherwise; `undetermined` when neither, never a
silent default to US law. Recorded in full as `docs/adr/0007`.

When it is undetermined the analysis still runs, and degrades in exactly one place:
severity still stands, because under ADR 0003 it comes from properties of the wording,
which are textual facts. Only the jurisdiction-dependent legal claims — non-compete
enforceability, arbitration effect, statutory caps on indemnity, and four others named in
the ADR — are withheld rather than guessed.

### D9 — Severity is an integer 1–4

`DESIGN.md`'s severity meter is four cells and announces "severity, N of 4", so the scale
had to be four steps. Mapped from `PRD.md` §5: subjective payment approval 4, IP reaching
beyond the deliverable and a long/broad/uncompensated non-compete 3, termination for
convenience with no kill fee 2, present-but-standard 1.

The ordering invariant **4 > 3 > 2** is a test, not a hope — story 12 requires that
termination for convenience ranks below threats to money already earned. The severity
*words* (Low / Moderate / High / Severe) are provisional UI copy and must go through the
humanizer skill when the UI lands; the numbers are the contract.

### D10 — Four judgment calls inside the fixture corpus

1. **`mustBeFlagged` was added to the sidecar shape.** `PRD.md` §5 says a bounded IP
   assignment is "flagged low or not at all", which a bare severity number cannot express.
   `expectedSeverity: 1, mustBeFlagged: false` says "1 if flagged, and not flagging it is
   also correct". Recall tests use `mustBeFlagged`; the paired tests use `expectedSeverity`.
2. **`ip-assignment` is deliberately absent from `expectedCleanChecklist`** on every
   fixture with a bounded assignment, because §5 permits flagging it at 1 rather than
   reporting it clean. Asserting "clean" there would assert something the PRD does not
   settle. The balanced fixture still lists seven clean entries, so §4 test 4's
   "populated checklist" half holds.
3. **The adhesion fixture is standard on the four clauses whose thresholds ticket 10 has
   not settled** — indemnity, liability cap, renewal, change control. A realistically
   brutal contract would carry a one-sided indemnity, but planting one would make the
   fixture depend on a threshold nobody has decided yet.
4. **The hedging pair carries no governing-law clause but has UK addresses and a UK-wide
   restriction.** ADR 0007 forbids inferring jurisdiction from a locale, so this fixture
   exists to catch a detector that guesses. Its sidecar expects `undetermined`.

### D11 — `.gitattributes` was added, which the ticket did not ask for

Git's `core.autocrlf` is on. `unreadable-scan.pdf` contains no NUL bytes, so git
auto-detects it as text and would rewrite its line endings on checkout, breaking the byte
offsets in its cross-reference table — this ticket would have shipped a PDF that is
corrupt for anyone who clones on Windows. The corpus is also compared byte for byte for
the paired fixtures and the verbatim citations, which the same translation would break.
`.gitattributes` pins the corpus to LF and marks the PDF binary.

### D12 — The working surface is `/review`, under an `(app)` route group

The landing page keeps `/` and is not touched again until ticket 18. Everything a signed-in
Signer does lives under `app/(app)/`, with the shell at `app/(app)/layout.tsx` — the target
the app-shell brief already names — and the working screen at `app/(app)/review/page.tsx`.

Ticket 04 is the first ticket into that group, so it establishes the shell that 05, 07, 08,
12, 13, 14 and 15 all extend. That is also why 04 and 05 were not run in parallel: both
would have created the same `layout.tsx`.

### D13 — Bringing a document in: paste and file are equals

The app-shell brief lists this as unresolved. Settled: both paths are offered side by side
and both produce the same extraction result.

Paste is the path that works with no account, no dependency and no Supabase, which is the
configuration you asked to be able to run in. Making it a second-class alternative to file
upload would have meant the only fully-working path in your absence was the degraded one.

### D14 — The unreadable state is a type error, not a convention

`ExtractionResult` is a discriminated union whose `unreadable` arm carries no `text` and no
`sentences` field at all. I verified this rather than taking it on trust: a probe file that
reads `result.text` without narrowing on `outcome` fails to compile with
`TS2339: Property 'text' does not exist on type 'ExtractionResult'`.

This matters more than it sounds. The spec calls an unreadable document presenting as a
clean bill the worst failure this product can have, and the usual defence is a rule someone
has to remember. Here a caller that forgets the case does not ship.

Three supporting calls the agent made, all kept:
- **A 200-character floor.** A scan with a burnt-in header yields a few characters, and
  analysing almost-nothing is the same failure wearing a disguise. What did come out is
  shown, so the Signer can see why it was rejected.
- **Five unreadable reasons, not one.** A password-protected file and a scan need different
  advice; calling an encrypted contract "damaged" would be wrong. The UI message table is
  keyed by the reason type, so a new reason without copy will not compile.
- **PDF line unwrapping.** `splitIntoSentences` ends a sentence at a line break, so a PDF's
  typesetting would have cut every citation at half a line. The rejoin is conservative —
  its failure mode is a break left in, never one invented.

### D15 — `/sign-in` is currently a dangling link

`app/page.tsx` (the finished landing page) links to `/sign-in`, which does not exist yet.
Ticket 05 creates it. Until then the working surface is reachable directly at `/review`
and runs with the Supabase variables absent, so nothing is blocked — but the landing
page's call to action is broken in the meantime. If you deploy before ticket 05 lands,
that link 404s.

### D16 — Supabase client is `@supabase/supabase-js` + `@supabase/ssr`, and auth runs server-side

`CLAUDE.md` requires asking before a dependency. Asked and answered: those two and nothing
else. `@supabase/ssr` is what makes a session survive closing the tab, because a server
component can read cookies but cannot write them, so something has to renew an expiring
token before render.

All auth runs through Server Actions rather than a browser client, so the password never
enters client state and there is no second session-reading path that can disagree with the
verified one. Next 16 renamed `middleware.ts` to `proxy.ts`; the matcher is scoped to
`/review`, `/sign-in` and `/auth` so the deployed landing page keeps its static caching.

### D17 — Two criteria on ticket 05 are deliberately left unticked

This is the most important thing in this report, because it concerns the one guarantee
`CLAUDE.md` calls non-negotiable: a Signer's documents are theirs alone.

**What is built:** the `documents` table, row level security, and four separate policies
(one per command rather than one `for all`, so widening any of them later is a visible
edit). Every policy is scoped to `auth.uid()`. `anon` is additionally revoked, so a
session-less caller holding the publishable key is refused by two independent mechanisms.
No column holds bytes, a blob, base64 or a storage-bucket key — only extracted text.

**What is NOT proven:** none of it has ever run. There is no Supabase project, and I
checked for every alternative — no Docker, no local Postgres, no Supabase CLI, no
credentials. So:
- Criterion 3 ("RLS is enabled, and a second Signer's account cannot read the first's
  rows") is **unticked**. The subagent had ticked it; I reversed that. The policies are
  written, not enabled — nothing is enabled until you apply the migration.
- Criterion 4 (the cross-Signer read test) is **unticked**. The test is real and complete
  — two accounts, nine different read, write and delete attempts, every assertion made
  through a Signer's own client rather than the service-role one that would bypass RLS.
  It skips when the three `SUPABASE_TEST_*` variables are absent, printing a banner to
  stderr that names them and says isolation is not proven. It cannot report green unrun.

**What does run today:** `tests/migrations.test.ts` reads the actual `.sql` files and
asserts that every table has RLS, every policy is scoped to `auth.uid()`, no policy is
`using (true)`, and no column could hold a file. I verified it bites by adding a
deliberately bad migration myself — a `bytea` column, `using (true)`, missing policies —
and it produced four accurate failures. It is a real check over real artifacts, and it is
not a substitute for running the isolation test.

**First thing to do when you sit down:** apply the migration to a scratch project, set the
three `SUPABASE_TEST_*` variables, and run `npm test`. Until that test runs green, treat
per-Signer isolation as designed rather than delivered.

### D18 — `AnalysisResult` is the shape five later tickets inherit

Built now so 08, 09, 11, 13 and 14 extend it rather than reshape it. Two parts of it are
structural rather than conventional, which is the point:

- **`sourceSentence` is a required field on a flag.** ADR 0001 says an unsourced flag must
  be unrepresentable, so it is not an optional annotation someone can forget.
- **`RiskFlag` is a union distributed over clause type.** `unstatedProperties` on a
  payment-approval flag cannot contain `"durationMonths"`, because that is not one of the
  properties payment approval's severity function consumes. ADR 0006's rule that a hedge
  may only name a property the severity function actually used is therefore a compile
  error, not a rule someone has to remember.

`flags` and `checkedClean` come back as empty arrays this ticket. An empty array is the
honest answer to "no flag detection has been built yet"; a fabricated flag would not be.
The screen says so explicitly, because a summary with nothing after it reads as a clean
bill, which is the failure the spec cares most about.

`counterOffer` is nullable because ticket 08 ships flags before ticket 11 ships
counter-offers. Null means "not drafted", never a placeholder.

---

## Could not be verified in this run

- **The live model was never reached.** This is the one thing in step 7 I could not do, and
  the key is not the problem — it works.

  Every call to the pinned provider returns **HTTP 429**: *"temporarily rate-limited
  upstream… limit_source: upstream_provider_shared_pool, is_byok: false"*. The subagent
  retried 25 times across about 32 minutes; I then confirmed it independently with my own
  single request. What this tells us is quite specific, because the failure is not a 401 or
  a 404:
  - authentication works
  - the request routes to the pinned Fireworks provider correctly
  - the request is priced correctly (an earlier attempt returned a 402 naming the token
    budget, which is why `max_tokens: 4096` is now set — without it the request reserves
    the model's whole completion window and is refused outright)

  So the integration is proven right up to the provider boundary. What remains unproven is
  the **structured-output response path**: whether the model returns JSON matching the
  schema, and whether `ResponseSchema.parse` accepts it. That path is exercised against the
  fixture stub only.

  **The remedy, in your hands:** the account is using OpenRouter's shared Fireworks pool.
  Adding your own Fireworks key at `https://openrouter.ai/settings/integrations` moves you
  off the shared limit. I did **not** set `allow_fallbacks: true` or route to another
  provider, because you pinned the provider deliberately and told me not to invent a way
  around a blocker.

  Until one real call succeeds, treat every claim about live model behaviour in this build
  as untested. The seam's shape, its error handling and its refusal to invent a Sender are
  all tested; what the model actually returns is not.


- **Row Level Security.** No Supabase project exists, so the policies in
  `supabase/migrations/` are unrun and untested. The isolation claim in `CLAUDE.md` is
  written, not proven.
- **The landing page at a real 390px viewport.** Ticket 17's last open criterion, and a
  KNOWN GAP already recorded at the foot of `DESIGN.md`: Chrome refused every window
  resize in this environment, so the narrow-width evidence on file is a simulation that
  renders the h1 at the wrong size. I did not re-attempt it and did not mark the criterion
  done. Do not assume mobile was checked.
