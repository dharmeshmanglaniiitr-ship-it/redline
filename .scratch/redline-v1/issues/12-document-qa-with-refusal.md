# 12: Document Q&A with explicit refusal

**What to build:** A Signer asks a question about the contract in their own words and
gets an answer drawn from the document alone — so they can check specific worries the
flags did not cover.

The hard requirement is the refusal. Asked something the document does not address — what
happens if the Sender goes bankrupt, against a contract silent on insolvency — the answer
must be that the document does not say. Not a general legal answer. Silence in a contract
is itself information, and dressing it up as an answer is the product stating something
the text does not support.

Answers quote the document, so a Signer can verify them the same way they verify a flag.

This is the second analysis seam: a function of document text and a question, returning a
grounded answer or an explicit refusal. Like the first, it sits above the model gateway,
the database and the UI, and is testable without either.

**Blocked by:** 06, 07

**Status:** done — 2026-09-14. `lib/analysis/answer.ts` is the second seam. The answer is a
discriminated union whose refused arm has no `sourceSentence` field at all, so a refusal
that cites a sentence does not compile — asserted by a `@ts-expect-error` that
`npx tsc --noEmit` runs. All 34 unanswerable questions across all 10 sidecars refuse, and
the refusal is checked for general legal content rather than only for being a refusal.

A quote the citation verifier cannot match verbatim collapses to a refusal rather than
being shown, which is ADR 0001's rule applied to answers: the model is not trusted to have
quoted correctly here either. Live refusal behaviour under a real model is untested
(HTTP 429).

- [x] A Signer can ask a free-text question about an uploaded document and get an answer
- [x] Answers quote the document they are drawn from
- [x] The fixture set of unanswerable questions produces explicit refusals, not general
      legal answers
- [x] A refusal is distinguishable in the returned structure, so a test can assert one
      occurred without matching on wording
- [x] The seam is callable as a function of document text and question, with no browser
      and no UI
- [x] Answers explain what the document says; they do not advise whether to sign
