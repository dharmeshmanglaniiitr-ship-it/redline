# Standing brief — read this before touching anything

You are implementing ONE ticket in the Redline build. You have no memory of earlier
sessions. Everything you need is here or in the files named here.

## Read first, in this order
1. `CLAUDE.md` — the project's ground rules. They override your defaults.
2. `.scratch/redline-v1/spec.md` — the v1 spec.
3. `docs/spec-v1.md` — the in-repo spec (Implementation Decisions and Testing Decisions
   sections are the ones that bind you).
4. `docs/adr/` — all seven ADRs. 0001 (every flag cites its source), 0003 (severity from
   specificity), 0004 (communication philosophy), 0005 (jurisdiction-aware),
   0006 (hedging trigger), 0007 (jurisdiction detected then corrected) are load-bearing.
5. `PRD.md` §5 for clause thresholds, `PRODUCT.md` for voice, `DESIGN.md` for every
   screen, `.impeccable/surfaces/app-app-layout-tsx.md` for the app shell.
6. Your own ticket file under `.scratch/redline-v1/issues/`.

## The two questions CLAUDE.md tells you to stop and ask about — already answered
**Model access.** The model is whatever `OPENROUTER_MODEL` says, called through
OpenRouter's OpenAI-compatible endpoint with `OPENROUTER_API_KEY`. Provider is pinned
(`order: ["fireworks"]`, `allow_fallbacks: false`, `require_parameters: true`), reasoning
effort `low`, structured JSON output on every analysis and answer call. **Never write a
model id into code.** This is already implemented in `lib/model/openrouter.ts` — use it,
do not reimplement it.

**Supabase.** No Supabase project exists. Build sign-in, the library and red lines
against the Supabase client, reading `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Every table and policy is a SQL migration file under
`supabase/migrations/`, which the user will run by hand. **The app must start and analyse
a pasted document with those two variables absent**; only the library and red lines need
an account. **Never mock auth in the product.** `lib/supabase/` already has the client,
signer and config modules — use them.

## What "done" means. These are disqualifying.
A ticket containing any of the following is NOT done, and claiming it is done is worse
than leaving it open:
- a function that returns a fixed value
- a `TODO`, or an error that says "not implemented"
- a test that checks a file exists, or that a function is defined
- a test that mocks the very thing it is meant to test

A build told only to make the tests pass will ship stubs. Do not be that build. If you
cannot make something genuinely work, say so plainly in your final report and leave the
criterion unticked — that outcome is respected; a fake green is not.

## Fixtures
`tests/fixtures/` holds the corpus: `adhesion-contract.{txt,json}` (planted clauses),
`balanced-contract.{txt,json}` (clean), six paired fixtures, and `unreadable-scan.pdf`.
Each `.json` sidecar records, per planted clause, its **exact source sentence**, its
expected severity band, its stated and unstated properties. Load them through
`tests/support/fixtures.ts` (`loadFixture`, `fixtureNames`, `FIXTURE_PAIRS`).

**In tests the model client is a stub** — `tests/support/stub-model.ts`
(`createStubModelGateway(fixture)`) — which builds its payload from the sidecar. The
suite runs with no API key and no network. It already emits `summary`, `findings`,
`checkedClean`, `jurisdiction` and `answer`; extend it only if your ticket genuinely
needs a shape it does not yet produce, and never make it assert anything.

## Architecture already in place — extend, do not reshape
- `lib/model/types.ts` — `ModelGateway`, `ModelRequest`, `ResponseSchema<Shape>`,
  `ModelResponseError`. One narrow seam; all provider detail sits behind it.
- `lib/model/openrouter.ts` — the real client, provider pinning, `openRouterAccess()`.
- `lib/analysis/clauses.ts` — `CHECKLIST_ENTRIES`, `SETTLED_CLAUSE_TYPES`,
  `SEVERITY_PROPERTIES`, `SeverityProperty<T>`. The clause vocabulary's only home.
- `lib/analysis/result.ts` — `AnalysisResult`, `RiskFlag` (a union distributed over
  clause type), `Severity` (1-4), `Jurisdiction`, `CounterOffer`, `RedLine`,
  `DocumentSummary`. `sourceSentence` is required on a flag by design.
- `lib/analysis/analyze.ts` — `analyze(request, gateway)`, the one seam every analysis
  returns through. Pure over text; takes its gateway as an argument.
- `lib/analysis/severity.ts` — `deriveSeverity`, `severityTriggers`,
  `unstatedPropertiesOf`, `ClauseReading`.
- `lib/analysis/citation.ts` — `createCitationVerifier`, `citationVerifies`,
  `keepVerifiedCitations`.
- `lib/analysis/wording.ts` — `severityWord`, `hedgeNoteFor`, `titleFor`, `costFor`,
  `flagId`.
- `lib/document/` — extraction as a discriminated union; an
  unreadable document has no `text` field, so analysing one is a compile error.
- `lib/text/sentences.ts` — `splitIntoSentences`.
- `app/(app)/` — the route group for everything a signed-in Signer does.
  `layout.tsx` is the shell, `review/page.tsx` the working screen, `sign-in/` the
  auth screens. **`app/page.tsx` is the finished landing page — do not touch it**
  unless your ticket is 18.

## Screens
Every screen obeys `DESIGN.md`, `PRODUCT.md` and `.impeccable/surfaces/app-app-layout-tsx.md`.
**Do not start an impeccable direction round** — it opens a browser and waits for a human
who is not here.

**All copy a reader sees** — labels, empty states, error messages, headings, button text —
**must go through the humanizer skill before you finish.** Invoke it with the Skill tool
(`humanizer:humanizer`) on the copy you wrote. `CLAUDE.md` makes copy that reads as though
a model wrote it a defect. Say in your report that you ran it.

## Commands
- `npx tsc --noEmit` — typecheck. Must pass.
- `npm test` — full suite (vitest). Must pass.
- `npm run build` — production build. Must pass.
Run all three before you report back. Report the actual output, not a summary of what you
hoped it said.

## The live model is unreachable
Every OpenRouter call returns HTTP 429 from the pinned provider's shared pool. Auth,
routing and pricing are confirmed working; this is an upstream shared-limit problem.
**Do not route around it** — do not set `allow_fallbacks: true`, do not switch provider,
do not write a model id. Test against the fixture stub and say in your report that live
behaviour is untested.

## Your final report back
Keep it short and factual. State: what you built, which acceptance criteria are now met
and which are not and why, the exact output of the three commands, any decision you made
that the ticket did not settle (with the reason), and anything you could not verify.
