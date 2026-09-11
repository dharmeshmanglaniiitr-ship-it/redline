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

**Status:** ready-for-agent

- [ ] A Signer can ask a free-text question about an uploaded document and get an answer
- [ ] Answers quote the document they are drawn from
- [ ] The fixture set of unanswerable questions produces explicit refusals, not general
      legal answers
- [ ] A refusal is distinguishable in the returned structure, so a test can assert one
      occurred without matching on wording
- [ ] The seam is callable as a function of document text and question, with no browser
      and no UI
- [ ] Answers explain what the document says; they do not advise whether to sign
