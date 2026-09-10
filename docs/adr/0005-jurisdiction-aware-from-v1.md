# 5. Redline is jurisdiction-aware from v1

## Decision
Redline's severity judgments and legal claims (e.g. non-compete enforceability,
arbitration clause effect) must account for which jurisdiction's law governs the
document, rather than assuming US contract law by default. This is committed as v1
scope, not deferred.

## Alternatives
- US-law contracts only, stated as an explicit boundary: narrower, matches the likely
  mix of the research's willingness-to-pay evidence (largely US-sourced), and proves
  the core analysis works in one legal framework before generalizing. This was the
  recommended option going into this decision.
- Avoid hard-coding US-specific legal assumptions without building full detection:
  a middle option — don't assert unstated US-specific claims (e.g. "often
  unenforceable") as universal, but don't commit to jurisdiction detection either.
  Raised as a narrower alternative during this interview and explicitly rejected in
  favor of full jurisdiction-awareness.

## Why
Freelancing is a globally distributed workforce, and jurisdiction materially changes
whether a specific severity judgment is even correct — a non-compete flagged as "often
unenforceable, so lower severity" under US FTC-informed reasoning is not necessarily
true in other jurisdictions. Committing to jurisdiction-awareness in v1, made
deliberately after being pushed back on for expanding CLAUDE.md's closed six-capability
scope list.

## Consequences
- CLAUDE.md's scope section needs to be amended to reflect this — proposed separately,
  not auto-written, per this repo's standing rule that CLAUDE.md changes are proposed
  and confirmed, not made directly.
- The severity model (ADR 0003) now needs a jurisdiction input, not just clause-text
  analysis — how jurisdiction is determined (asked of the user, detected from document
  language, or both) is not yet designed and is real, undesigned scope, not a detail.
- This is a meaningfully larger v1 than "prove the analysis works in one legal
  framework first" would have been — accepted deliberately, not by default.
