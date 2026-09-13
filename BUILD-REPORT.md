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

