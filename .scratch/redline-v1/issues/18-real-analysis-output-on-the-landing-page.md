# 18: Real analysis output on the landing page

**What to build:** Replace the landing page's labelled illustration with output the real
analysis actually produced, so a Signer judging whether Redline's claims are checkable is
looking at the thing itself rather than a drawing of it.

Ticket 17 ships the page before the analysis exists, which leaves story 34 — seeing what
a flag and its source sentence look like — served by an illustration. That is honest, and
it is measurably weaker proof. The product's entire claim is that its output is checkable
rather than plausible-sounding; demonstrating that claim with something hand-made is the
one place where being honest and being convincing pull in opposite directions.

Use a contract from the fixture corpus, not a real client contract, and say which it is.
A demonstration that quietly implies a real customer's document would fabricate exactly
the kind of proof `PRODUCT.md` says does not exist.

**Blocked by:** 08, 17

**Status:** done — 2026-09-14. The page reads `lib/landing/sample-analysis.ts`, generated
by `scripts/landing-sample.ts` from the real `analyze()` seam over
`tests/fixtures/adhesion-contract.txt`, and writes no findings of its own. `/` is still
statically prerendered and calls no model. `tests/landing-sample.test.ts` rebuilds the
sample and fails if the committed file drifts from what the analysis produces today, so
the artifact cannot go stale unnoticed.

The committed artifact is stub-derived, because the drift test has to reproduce it offline
with no key, and the page says so in as many words. `producedBy` is a single-arm union, so
regenerating from a live model would need a second arm and new copy rather than a quiet
swap.

All three defects recorded below dissolved, and each was checked rather than assumed — see
the commit message for what happened to the second one, which did not dissolve the way the
write-up guessed.

**Three positioning defects ticket 16 found in `app/page.tsx` and deliberately did not
fix, because this is the ticket that touches that page.** All three are the subtler
failure mode: Redline stating something the document does not support. Replacing the
illustrated proof with real analysis output should dissolve all three, since the real
analysis does not make any of these mistakes — but check each one rather than assuming.

1. The sample payment finding says "nothing in the contract says what good enough means",
   yet the sample clause *does* state its standard ("satisfactory to the Client in its
   sole and absolute discretion"). The product writes two different sentences for
   stated-subjective and unstated; the page uses the unstated one over a clause that
   states it.
2. The sample non-compete is titled "Two years, worldwide, unpaid" and says "you are paid
   nothing for agreeing to that", but the sample clause is *silent* on compensation. The
   product would say "It says nothing about paying you for it." Asserting silence as a
   negative fact is what `tests/counter-offers.test.ts` already forbids in the product.
3. The CLEARED list names five entries (Invoice due date, Expenses, Confidentiality,
   Revisions, Governing law) that are not among the product's eight checklist entries,
   under the line "Redline names every clause it examined". It describes a checklist
   Redline does not have.

- [x] The flag shown on the landing page was produced by the real analysis
- [x] Its source sentence appears verbatim in the document it came from, held to the same
      exact-match standard as the product itself
- [x] The document behind the demonstration is identified as a sample, never presented or
      implied to be a real client's contract
- [x] The illustration labelling from ticket 17 is removed, not left contradicting real
      output
- [x] The demonstration stays legible and followable by keyboard and screen reader
- [x] A stale demonstration is a defect: if the analysis output shape changes, this is
      regenerated rather than left as a picture of an older product
