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

**Status:** done — 2026-09-13, with one caveat. The seam, the real OpenRouter client and
the screen are built and tested against the fixture stub. The live model was never reached:
every call returns HTTP 429 from the pinned provider's shared pool. Authentication, routing
and pricing are all confirmed working, so the structured-output response path is the only
part unproven live. See BUILD-REPORT.md.

- [x] A Signer can go from picking a file to reading a summary of it
- [x] The summary names the Sender and identifies the engagement the contract covers, so
      a Signer can confirm they are looking at the right document
- [x] The summary is in plain English, not restated legal language
- [x] The analysis is callable as a function of document text, exercisable in a test with
      no browser and no UI
- [x] Model calls go through OpenRouter, with the key in the gitignored environment file
- [x] The result shape anticipates flags, the checked-clean list and counter-offers
      rather than being summary-only
- [x] The OpenRouter dependency was asked about before being added (`CLAUDE.md`)
