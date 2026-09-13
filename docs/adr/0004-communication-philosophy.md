# 4. Redline over-flags, hedges only when genuinely uncertain, and gives a specific clean bill

## Decision
Three related calls about how Redline communicates findings:
1. Redline prefers false positives over false negatives. An unflagged real risk costs
   the signer money or rights with no warning; a wrongly-flagged harmless clause costs
   a few seconds, and is self-correcting because every flag cites its exact source
   sentence (ADR 0001) — the signer can check it themselves.
2. Redline states findings in confident, plain language by default, and hedges
   explicitly only when its own confidence in the interpretation is genuinely low,
   rather than asserting a shaky reading as fact.
3. When a document has nothing wrong in an area Redline checked, it says so
   specifically — naming what was checked and came back clean — rather than a generic
   "looks good" or manufacturing a low-severity finding to avoid looking idle.

## Alternatives
- Under-flag / stay quiet unless confident: protects the product's authority (a wrong
  flag damages trust more than a missed one) at the cost of occasionally missing
  something real. Rejected — the citation requirement makes the cost of a false
  positive bounded and checkable, which false negatives aren't.
- Always confident, never hedge: simpler, and arguably justified since every claim is
  already checkable against its citation. Rejected in favor of hedging on genuinely
  uncertain interpretations, because a confidently wrong claim about someone's real
  contract was judged worse than an uncertain-sounding one.
- Minimum-necessary or always-something-flagged for clean documents: both rejected —
  the first under-communicates why the document is safe, the second is the "always
  finds problems" failure mode that makes a risk tool stop being believed.

## Why
A risk-flagging product's credibility depends on the reader being able to trust both
its "this is risky" and its "this is fine" verdicts. Over-flagging with citations,
hedging only when warranted, and giving a specific clean bill all serve the same goal:
every claim Redline makes, positive or negative, should be something the reader can
check, not just something they have to trust.

## Consequences
- "Genuinely uncertain" is not yet a defined trigger. Left as-is, it risks becoming a
  default hedge that undermines the same trust it's meant to protect. This needs a
  concrete, checkable definition before implementation — not resolved by this decision
  alone. Settled in ADR 0006.
- Redline must maintain and report against a defined checklist of clause categories
  per document type, so "checked and came back clean" is a real claim, not a
  reformulated generic pass.
- Over-flagging as a bias needs a matching UI/UX decision (not covered here) for how
  low-confidence or low-severity flags are visually deprioritized, so a report doesn't
  read as uniformly alarming just because more things get flagged.
