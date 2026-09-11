# 07: The analysis seam, delivering a plain-English summary

**What to build:** A Signer uploads a contract and gets back a plain-English account of
what it commits them to — what the engagement is, who the Sender is, and what they would
be agreeing to — without having to parse legal language.

Deliberately no risk flags yet. This ticket exists to establish the seam and prove the
whole path works: extracted text goes in, a structured result comes back, and it renders.
The analysis is a pure function over document text sitting above the model gateway, the
database and the UI, so its behaviour is testable without a browser or a network. Model
calls go through OpenRouter.

Getting the seam right here is most of the value of the ticket. Every later analysis
capability — flags, counter-offers, the clean bill — returns through this same function,
so its shape should anticipate them rather than be widened later.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] A Signer can go from picking a file to reading a summary of it
- [ ] The summary names the Sender and identifies the engagement the contract covers, so
      a Signer can confirm they are looking at the right document
- [ ] The summary is in plain English, not restated legal language
- [ ] The analysis is callable as a function of document text, exercisable in a test with
      no browser and no UI
- [ ] Model calls go through OpenRouter, with the key in the gitignored environment file
- [ ] The result shape anticipates flags, the checked-clean list and counter-offers
      rather than being summary-only
- [ ] The OpenRouter dependency was asked about before being added (`CLAUDE.md`)
