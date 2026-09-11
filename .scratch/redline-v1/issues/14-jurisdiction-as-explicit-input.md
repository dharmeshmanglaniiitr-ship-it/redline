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

**Status:** ready-for-agent

- [ ] Jurisdiction is an explicit input to the analysis, not an implicit assumption
- [ ] An unknown jurisdiction is surfaced to the Signer rather than defaulted to US law
- [ ] The Signer can see which jurisdiction the analysis assumed, and correct it
- [ ] Correcting the jurisdiction re-runs or re-ranks the analysis accordingly
- [ ] Enforceability claims are worded relative to the governing jurisdiction, never as
      universal fact
- [ ] The determination mechanism matches the decision recorded in ticket 03
