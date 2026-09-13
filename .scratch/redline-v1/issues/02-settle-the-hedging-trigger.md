# 02: Settle the hedging trigger

**What to build:** A decision, not code. ADR 0004 commits Redline to stating findings in
confident plain language by default and hedging only when its confidence in the
interpretation is genuinely low — but it never defines what "genuinely low" means. The
spec names this as a blocker before the analysis is built, for a specific reason: left
undefined, hedging drifts into being the default, and the output becomes safe and
useless. That is the exact failure the decision was meant to avoid.

Produce a definition concrete enough that someone reading a piece of output can say
whether hedging was correct there. A trigger that can only be judged by feel has not
settled anything.

**Blocked by:** None (can start immediately)

**Status:** done — 2026-09-13, settled by `docs/adr/0006`: Redline hedges a finding if
and only if a severity-determining property it consumed is unstated in the document,
and the hedge names that property.

- [x] The condition under which Redline hedges is stated in terms someone can check
      against a specific finding, not in terms of the model's self-reported confidence
      alone
- [x] The definition distinguishes hedging about an interpretation from hedging about a
      jurisdiction-dependent legal claim, which ADR 0005 already handles separately
- [x] Worked examples exist on both sides of the line: findings that should be stated
      plainly and findings that should be hedged
- [x] The decision is recorded as an ADR alongside the existing ones, following their
      Decision / Alternatives / Why / Consequences shape
- [x] `PRD.md` §4 and the spec's Implementation Decisions no longer describe this as
      undefined
