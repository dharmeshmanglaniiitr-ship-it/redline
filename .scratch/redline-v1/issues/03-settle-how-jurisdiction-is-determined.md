# 03: Settle how jurisdiction is determined

**What to build:** A decision, not code. ADR 0005 commits Redline to accounting for the
law governing a document rather than assuming US contract law, and explicitly records
that *how* jurisdiction gets determined — asked of the Signer, detected from the
document's own governing-law language, or both — is undesigned. `PRD.md` calls this real
undesigned scope rather than a detail, and ADR 0005 calls it the largest scope decision
in v1.

Settle it. The answer shapes both the analysis input and what the Signer sees, so it
gates the ticket that surfaces jurisdiction in the product.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The decision states whether jurisdiction is asked, detected, or both, and if both,
      which wins when they disagree
- [ ] The behaviour when jurisdiction cannot be determined is defined — and it is not
      a silent default to US law
- [ ] The decision covers what the Signer is shown about the assumed jurisdiction and
      how they correct it
- [ ] The decision names which kinds of claim are jurisdiction-dependent, so the
      analysis knows what must be stated relative to jurisdiction rather than as fact
- [ ] The decision is recorded as an ADR alongside the existing ones, following their
      Decision / Alternatives / Why / Consequences shape
