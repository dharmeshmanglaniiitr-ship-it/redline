# 08: Risk flags — verified citations and severity derived from clause properties

**What to build:** The product's core claim, in one ticket. A Signer sees the contract's
risky clauses listed worst-first, each explained in terms of what it would cost them, and
each quoting the exact sentence it came from so they can find it in their own document
and confirm Redline is not inventing it.

Two properties make this ticket what it is, and neither is optional.

**A flag without its source sentence must be unrepresentable, not merely discouraged.**
The source sentence is a required field on a flag. And the citation is *verified
mechanically after generation, not trusted* — every quoted sentence is checked by exact
string match against the parsed document text before the flag is shown. A flag whose
quote does not appear verbatim is dropped, not displayed with a caveat. The model is not
trusted to have quoted correctly. Paraphrased or reformatted text fails this check even
when it is materially accurate.

**Severity comes from what a clause says, not from which category it belongs to.** For
each flagged clause, extract the properties that determine severity — for a non-compete,
its duration, its geographic and industry scope, and whether the restriction is
compensated; for IP assignment, whether it reaches past the engagement's deliverable; for
payment terms, whether the acceptance standard is objective or left to the Sender's
judgment — and derive severity from those properties. This is what makes ADR 0003 real
rather than aspirational, and it is what the paired fixtures test.

The four settled orderings: payment gated on the Sender's subjective satisfaction ranks
highest, because it threatens money already earned rather than future opportunity. IP
assignment reaching beyond the deliverable ranks high, while standard "the client owns
what I built for them" is flagged low or not at all — flagging that high would cry wolf
on the majority of legitimate freelance contracts. Termination for convenience with no
kill fee is flagged, but below subjective payment approval. Non-competes are judged on
duration, breadth and compensation rather than on merely existing.

Redline prefers over-flagging to missing something, because every flag carries a source
sentence a Signer can check, which makes a false positive bounded and self-correcting in
a way a false negative never is. Apply the hedging trigger from ticket 02 to how findings
are worded.

**Blocked by:** 02, 06, 07

**Status:** ready-for-agent

- [ ] Flags render in severity order, worst first
- [ ] Every flag quotes the exact sentence it came from
- [ ] Every source sentence is verified by exact string match against the parsed document
      before display; a flag failing verification is dropped, never shown with a caveat
- [ ] A flag cannot be constructed without a source sentence
- [ ] Each flag explains what the clause would cost the Signer, not just what it is
- [ ] Severity is computed from extracted clause properties, and those properties are
      inspectable at the seam rather than buried in a prompt
- [ ] The paired fixtures produce materially different severities — the test that
      separates a real analysis from a category lookup
- [ ] Fixtures seeded with a known dangerous clause flag it; recall is the tight
      constraint and precision the loose one
- [ ] Citation accuracy across the whole corpus is 100% — any failure is a defect, not a
      degradation
- [ ] Wording follows the hedging trigger settled in ticket 02
