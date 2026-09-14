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

**Status:** implemented, uncommitted. `analyze()` now returns populated `flags`, the
review screen renders them, and the four remaining pieces below are done. One criterion
is qualified rather than ticked: see the note under the paired fixtures.

Historical note, kept because the three modules it describes are still the ones to build
on. A previous run was cut off mid-ticket by a session limit, but its work survived and is
committed. **Three modules already exist and should be read before anything is written:**

- `lib/analysis/severity.ts` — `deriveSeverity()`, `severityTriggers()` and
  `unstatedPropertiesOf()`. Severity is computed in code from extracted clause
  properties, never asked of the model, which is what criterion 6 requires.
- `lib/analysis/citation.ts` — `createCitationVerifier()`, `citationVerifies()` and
  `keepVerifiedCitations()`. Exact-string verification against the document text.
- `lib/analysis/wording.ts` — `severityWord()`, `hedgeNoteFor()`, `titleFor()`,
  `costFor()`, `flagId()`. Applies the ADR 0006 hedging trigger to how a finding reads.

All three were written without being imported anywhere. They are now wired in and each
has tests. What was done, against the four pieces this ticket had left:

1. `tests/severity.test.ts` and `tests/citation.test.ts` — unit tests for
   `deriveSeverity` and the verifier, including the paraphrase and the reformatted
   whitespace, both dropped rather than shown with a caveat.
2. `flagsPrompt` and `flagsResponse` in `lib/analysis/analyze.ts` ask for clause readings
   and turn them into flags. Citation verification, severity derivation and the hedge all
   happen inside `parse`, so an unverifiable flag cannot reach a caller. A severity number
   in the response is ignored; the schema does not describe one.
3. `app/(app)/review/marked-galley.tsx` — the paired mark, the meter's three channels and
   the leader rule at 1024px and above. `lib/text/marking.ts` cuts the document at the
   citations' boundaries.
4. `tests/risk-flags.test.ts` — the paired fixtures, corpus-wide citation accuracy and
   recall on every planted clause.

Note: the live model returns HTTP 429 from the pinned provider's shared pool, so all of
this is testable against the fixture stub only. Do not route around it. Live behaviour is
untested.

- [x] Flags render in severity order, worst first
- [x] Every flag quotes the exact sentence it came from
- [x] Every source sentence is verified by exact string match against the parsed document
      before display; a flag failing verification is dropped, never shown with a caveat
- [x] A flag cannot be constructed without a source sentence
- [x] Each flag explains what the clause would cost the Signer, not just what it is
- [x] Severity is computed from extracted clause properties, and those properties are
      inspectable at the seam rather than buried in a prompt
- [~] The paired fixtures produce materially different severities — the test that
      separates a real analysis from a category lookup.
      Two of the three pairs do: the IP pair comes back 1 against 3 and the non-compete
      pair 1 against 3. The third pair cannot, and the corpus says so: `pair-hedge-stated`
      and `pair-hedge-silent` differ only in whether the contract states that the
      restriction is unpaid, and `docs/adr/0006` requires an unstated property to be read
      at its dangerous end, so both halves are severity 3. Its sidecar records that
      ("Severity is unchanged between the halves, because a hedge never lowers severity").
      A severity difference there would mean a hedge had lowered a finding. That pair is
      asserted to differ materially in its hedge and its `unstatedProperties` instead.
- [x] Fixtures seeded with a known dangerous clause flag it; recall is the tight
      constraint and precision the loose one
- [x] Citation accuracy across the whole corpus is 100% — any failure is a defect, not a
      degradation
- [x] Wording follows the hedging trigger settled in ticket 02
