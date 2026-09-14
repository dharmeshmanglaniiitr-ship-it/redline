# 10: Settle thresholds for the four remaining checklist clauses

**What to build:** A decision, not code. Four clause types sit in Redline's checklist with
their dangerous-versus-standard thresholds unsettled: one-sided indemnity, uncapped
liability, auto-renewal, and unilateral rate or scope change. The spec puts them
explicitly outside its own scope and says they need the same treatment the first four
clauses got.

They have to be in the checked-clean list or the clean bill is not a real claim — so
leaving them undefined leaves a hole in ticket 09's promise.

Give each the same shape as the settled four: what specific, checkable property of the
wording makes an instance dangerous rather than standard. Severity comes from what the
clause says, not from the category it belongs to, so "one-sided indemnity is medium" is
not an answer.

This ticket sits after the first four clauses ship so their implementation teaches the
shape rather than being guessed at in advance.

Be honest about the evidence while doing it. `PRD.md` §8 records that uncapped liability
and unilateral termination surfaced only as risk-education and law-firm explainer
content, with no sourced individual complaint behind either. Auto-renewal is the
best-evidenced clause danger in the whole research — but that evidence is consumer
subscriptions, not freelance retainers.

**Blocked by:** 09

**Status:** done — 2026-09-14. `docs/adr/0008` records all four thresholds. The four clause types
four clause types are in `SETTLED_CLAUSE_TYPES` with their properties, `deriveSeverity`
and `severityTriggers` read them, `analyze()`'s `flagFrom` switch has an arm each, and
two new corpus fixtures — `retainer-exposed.txt` and `retainer-bounded.txt`, identical
except at the four planted clauses — carry both ends of every threshold. The live model
is still unreachable, so none of this has been run against a real model.

- [x] Each of the four clause types has a stated threshold distinguishing a dangerous
      instance from a standard one, expressed as properties of the wording
      (`docs/adr/0008`, `lib/analysis/clauses.ts`, `lib/analysis/severity.ts`)
- [x] Each threshold states where the clause ranks relative to the four already settled,
      and why (`docs/adr/0008`, and `deriveSeverity`'s docblock)
- [x] Jurisdiction-dependent reasoning is marked as such rather than asserted universally
      (`lawDecides` in `lib/analysis/wording.ts`; the unilateral change deliberately
      makes no legal claim, which ADR 0008 records as a decision rather than an omission)
- [x] Fixtures are added to the corpus for each, including the standard-instance case
      that must *not* be flagged high (`retainer-bounded.txt`, all four at severity 1
      with `mustBeFlagged` false)
- [x] The four clause types move out of the spec's Out of Scope section
- [x] Where a threshold rests on thin evidence, that is recorded rather than presented as
      settled fact (`docs/adr/0008`, per clause: weak for the indemnity, weakest for
      uncapped liability, thinnest of all for unilateral change, and strong-but-about-
      consumers for auto-renewal)
