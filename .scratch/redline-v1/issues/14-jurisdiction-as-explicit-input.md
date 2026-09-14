# 14: Jurisdiction as an explicit, surfaced input

**What to build:** A Signer outside the US gets severity judgments that reflect the law
actually governing their contract — not a US assumption presented as universal fact. And
they can see which jurisdiction Redline assumed, so they can correct it when it is wrong.

Freelancing is a globally distributed workforce, and jurisdiction materially changes
whether a severity judgment is even correct. A non-compete downgraded as "often
unenforceable" under US-informed reasoning is not necessarily unenforceable elsewhere.

**Jurisdiction is an explicit input, never silently defaulted.** When it is not known, it
is surfaced to the Signer rather than assumed. Legal claims that depend on it —
enforceability above all — are stated relative to that jurisdiction, not as universal
fact.

Implement the determination mechanism settled in ticket 03.

**Blocked by:** 03, 08

**Status:** done — 2026-09-14. `lib/analysis/jurisdiction.ts` implements ADR 0007 in two
halves: `detectJurisdiction` (a gateway call whose quoted governing-law sentence is
verified verbatim, so a detection the document does not contain is null rather than a
guess) and `determineJurisdiction` (pure; Signer beats document beats nothing). Correcting
it re-runs the whole analysis through the server action.

Severity is asserted invariant across jurisdictions flag by flag — id, clause type,
severity, citation, title, hedge, unstated properties and counter-offer — because under
ADR 0003 severity comes from textual facts and only the legal claims move.

The two trap fixtures are asserted to still carry their UK addresses and currency *and* to
detect nothing, so the test fails both if the detector starts guessing from a locale and
if someone defuses the fixtures. Live behaviour untested (HTTP 429).

- [x] Jurisdiction is an explicit input to the analysis, not an implicit assumption
- [x] An unknown jurisdiction is surfaced to the Signer rather than defaulted to US law
- [x] The Signer can see which jurisdiction the analysis assumed, and correct it
- [x] Correcting the jurisdiction re-runs or re-ranks the analysis accordingly
- [x] Enforceability claims are worded relative to the governing jurisdiction, never as
      universal fact
- [x] The determination mechanism matches the decision recorded in ticket 03
