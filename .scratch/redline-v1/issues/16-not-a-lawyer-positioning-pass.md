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

**Status:** ready-for-agent

- [ ] Flag explanations describe what a clause would cost, without recommending for or
      against signing
- [ ] Counter-offers draft language to send without advising whether to accept the
      contract
- [ ] Q&A answers stay inside the document and refuse rather than reaching for general
      legal knowledge
- [ ] Nothing in the product positions Redline as a substitute for a lawyer
- [ ] What Redline does and does not do is stated plainly where a Signer will see it,
      not buried
- [ ] Every claim shown to a Signer traces to something they can check — a cited
      sentence, a named checklist entry, or a stated jurisdiction
