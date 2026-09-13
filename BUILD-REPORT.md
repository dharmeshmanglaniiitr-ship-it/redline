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
| 01 | Project scaffold and first deploy | pending |
| 02 | Settle the hedging trigger | pending |
| 03 | Settle how jurisdiction is determined | pending |
| 04 | Browser text extraction | pending |
| 05 | Sign-in and per-Signer isolation | pending |
| 06 | Fixture corpus and test harness | pending |
| 07 | Analysis seam — plain-English summary | pending |
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

---

## Could not be verified in this run

- **Row Level Security.** No Supabase project exists, so the policies in
  `supabase/migrations/` are unrun and untested. The isolation claim in `CLAUDE.md` is
  written, not proven.
- **The landing page at a real 390px viewport.** Ticket 17's last open criterion, and a
  KNOWN GAP already recorded at the foot of `DESIGN.md`: Chrome refused every window
  resize in this environment, so the narrow-width evidence on file is a simulation that
  renders the h1 at the wrong size. I did not re-attempt it and did not mark the criterion
  done. Do not assume mobile was checked.
