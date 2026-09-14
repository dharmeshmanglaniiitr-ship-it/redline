# 16: Not-a-lawyer positioning pass

**What to build:** A review across everything Redline says to a Signer, checking one
line holds: the product explains a document and drafts language — it does not advise
whether to sign.

This is not decoration on top of finished features. It is the constraint the whole
product is positioned inside, and the reason it is a ticket rather than a note is that it
is only checkable once flags, counter-offers and Q&A all exist and can be read together.

The precedent is specific. DoNotPay was charged by the FTC in September 2024 for
marketing itself as a lawyer substitute without ever testing whether its output matched a
lawyer's, and settled for $193,000 plus a ban on advertising the service that way.
Redline's counter-offer and Q&A features sit closest to that line.

Two failure modes to hunt for. The obvious one is language that recommends or discourages
signing. The subtler one is Redline stating something the document does not support —
answering from general legal knowledge where the text is silent, or asserting a
jurisdiction-dependent claim as universal fact. Both are the same failure: the product
making a claim it cannot show the Signer the basis for.

**Blocked by:** 08, 11, 12

**Status:** done — 2026-09-14, with one residual recorded below. Every surface named in
the ticket was read, including all eighteen drafted counter-offers at both ends of every
threshold. Nothing recommends or discourages signing. Three defects were found and two
fixed; the third is on `app/page.tsx` and is written up in ticket 18, which owns that file.

The constraint is now enforceable rather than currently-true: `tests/positioning.test.ts`
drives the real analysis over the whole corpus and renders the real screens, and its
assertions were checked against injected regressions rather than assumed to bite. Advice
is matched as verb-plus-object so drafted contract language keeps the word "should", and
the jurisdiction rule is asserted as attribution rather than absence, because a bare word
ban would have outlawed the feature ADR 0005 requires.

- [x] Flag explanations describe what a clause would cost, without recommending for or
      against signing
- [x] Counter-offers draft language to send without advising whether to accept the
      contract
- [x] Q&A answers stay inside the document and refuse rather than reaching for general
      legal knowledge
- [x] Nothing in the product positions Redline as a substitute for a lawyer
- [x] What Redline does and does not do is stated plainly where a Signer will see it,
      not buried
- [x] Every claim shown to a Signer traces to something they can check — a cited
      sentence, a named checklist entry, or a stated jurisdiction

**Residual, recorded rather than fixed.** `summary.plainEnglish` is model prose with no
seam enforcement — its only guard is the prompt rule telling the model not to judge the
contract or advise whether to sign. It was not given the Q&A seam's check because the
three analysis calls run under `Promise.all`, so refusing a summary would take the flags
and the checklist down with it. It is the one Signer-facing surface that is neither
sentence-cited nor seam-checked, and it was so before this ticket.
