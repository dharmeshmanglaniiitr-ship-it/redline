# Spec: Redline v1

Source: `PRD.md`. Decisions: `docs/adr/0001`–`0005`. Vocabulary: `CONTEXT.md`
(**Signer**, **Sender**, **Leverage** are used here as defined there).

Covers all ten v1 capabilities in one document. Not published to an issue tracker —
none is configured for this repo yet; tickets live in `.scratch/redline-v1/issues/`.

---

## Problem Statement

A Signer receives a contract a Sender drafted, and has to decide whether to sign it
without being able to tell which of its terms will cost them. Finding out currently
means paying a lawyer — an average **$400** for a freelance contract review
(https://www.contractscounsel.com/b/freelance-contract-review-cost) — or reading a
red-flags blog post, asking a free legal Q&A site, or signing and hoping.

The failure this creates is specific: the document permits something the Signer did
not know they were agreeing to. Broad IP assignment that reaches past the deliverable.
Payment gated on the Sender's undefined satisfaction. A non-compete that outlasts the
engagement. The Signer has the Leverage to ask for changes — they just don't know what
to ask for, or that there's anything to ask about.

## Solution

Redline reads the document and tells the Signer what they'd be agreeing to, in terms
they can act on and check: a plain-English summary, risky clauses ranked by severity
with the exact sentence each came from, a drafted counter-offer per flagged clause,
and a question box answering only from the document. The Signer's own red lines drive
the ranking, and past documents stay in a library.

The product's whole claim is that its analysis is checkable rather than merely
plausible. Every risk claim carries the sentence it came from, so the Signer can
verify it against their own document instead of trusting the model.

## User Stories

**Upload and parsing**

1. As a Signer, I want to upload a contract from my machine, so that I can find out what I'd be agreeing to before I sign it.
2. As a Signer, I want the file parsed in my own browser so the original never leaves my machine, so that I don't have to trust a server with a confidential client contract.
3. As a Signer, I want to be told clearly when a document can't be read as text, so that I never mistake a failed upload for a clean contract.

**Summary**

4. As a Signer, I want a plain-English summary of what the contract commits me to, so that I understand the deal without parsing legal language.
5. As a Signer, I want the summary to name the Sender and the engagement it covers, so that I can confirm I'm looking at the right document.

**Risk flags**

6. As a Signer, I want risky clauses listed in severity order, so that I know what to worry about first when I have ten minutes.
7. As a Signer, I want every flag to quote the exact sentence it came from, so that I can find it in my own document and confirm the tool isn't inventing it.
8. As a Signer, I want each flag explained in terms of what it would cost me, so that I can judge whether I actually care about it.
9. As a Signer, I want an IP assignment that reaches beyond the deliverable flagged more severely than a standard one, so that I'm not alarmed by boilerplate that appears in nearly every freelance contract.
10. As a Signer, I want payment gated on the Sender's subjective satisfaction flagged at the highest severity, so that the biggest threat to money I've already earned is the first thing I see.
11. As a Signer, I want a non-compete judged on its duration, scope and whether it's compensated, so that a narrow three-month restriction isn't presented as equivalent to an uncompensated industry-wide one.
12. As a Signer, I want termination-for-convenience without a kill fee flagged, but ranked below threats to money I've already earned, so that the ordering reflects real cost rather than alarm.
13. As a Signer, I never want to see a flag without a source sentence, so that every claim the product makes is checkable.

**Clean bill**

14. As a Signer, I want to be told by name what was checked and came back clean, so that a quiet report means "we looked" rather than "we found nothing."
15. As a Signer with a genuinely fair contract, I want to be told it's fair, so that I can sign with confidence instead of hunting for a catch the tool implied but didn't name.

**Counter-offers**

16. As a Signer, I want a drafted counter-offer for each flagged clause, so that I can push back without knowing how to write contract language.
17. As a Signer, I want each counter-offer to reference the specific clause it replaces, so that the Sender can see exactly what I'm asking to change.
18. As a Signer, I want counter-offers I can send without rewriting them, so that I don't need a lawyer to use the thing I'm using instead of a lawyer.

**Document Q&A**

19. As a Signer, I want to ask questions about the document in my own words, so that I can check specific worries the flags didn't cover.
20. As a Signer, I want to be told when the document doesn't answer my question, so that silence in the contract isn't dressed up as an answer.
21. As a Signer, I want answers to quote the document, so that I can verify them the same way I verify flags.

**Red lines**

22. As a Signer, I want to record my own red lines, so that the analysis reflects what I personally refuse to accept.
23. As a Signer, I want editing my red lines to re-rank a document I've already uploaded, so that I can see the effect without re-uploading it.
24. As a Signer, I want my red lines to persist across documents, so that I don't restate them for every contract.

**Library and account**

25. As a Signer, I want to sign in, so that my library is mine and survives closing the tab.
26. As a Signer, I want past documents saved, so that I can check what I agreed to months later.
27. As a Signer, I want only my own documents visible to me, so that my client contracts are never exposed to another user.
28. As a Signer returning to a saved document, I want to see the analysis as it was saved, so that I don't have to re-run it to remember what it said.

**Jurisdiction**

29. As a Signer outside the US, I want severity judgments that reflect the law governing my contract, so that I'm not told a clause is unenforceable when it's enforceable where I live.
30. As a Signer, I want to see which jurisdiction the analysis assumed, so that I can correct it when it's wrong.

**Positioning**

31. As a Signer, I want the product to explain the document and draft language rather than tell me whether to sign, so that I know what I'm getting and don't mistake it for legal advice.

**Landing page**

Added after stories 1–31 were settled (`PRD.md` §3 item 10). Numbered last to avoid
renumbering, but first in the Signer's actual sequence — everything above assumes a
Signer who has already decided to upload.

32. As a Signer arriving for the first time, I want to understand what Redline does before I upload anything, so that I'm not handing a confidential client contract to something I can't evaluate.
33. As a Signer arriving for the first time, I want to see that my file is parsed in my own browser and never stored, so that I can weigh the privacy claim before I test it rather than after.
34. As a Signer arriving for the first time, I want to see what a flag and its source sentence actually look like, so that I can judge whether the analysis is checkable instead of taking the claim on trust.
35. As a Signer arriving for the first time, I want the page to state only what Redline can show, so that I'm not sold on proof that doesn't exist.
36. As a Signer arriving for the first time, I want to know Redline explains a document rather than replacing a lawyer, so that I arrive with the right expectation and not a legal one.

## Implementation Decisions

**Two seams, both pure functions over text.** `analyze(documentText, redLines,
jurisdiction)` returns the summary, ranked flags, the checked-clean list and the
counter-offers. `answerQuestion(documentText, question)` returns a document-grounded
answer or an explicit "the document doesn't say." Both sit above the model gateway,
the database and the UI, so every behavioural claim in this spec can be tested without
a browser or a network. Browser parsing sits outside both: text extraction is a
separate concern from analysis, which keeps a parsing failure distinguishable from an
analysis failure.

**An unsourced flag is unrepresentable, not merely discouraged.** The source sentence
is a required field on a flag, not an optional annotation. This makes ADR 0001
structural rather than a rule someone has to remember.

**Citations are verified mechanically after generation, not trusted.** Every source
sentence a flag carries is checked by exact string match against the parsed document
text before the flag is shown. A flag whose quoted sentence does not appear verbatim
is dropped, not displayed with a caveat. The model is not trusted to have quoted
correctly — verification is a step, not an assumption.

**Severity derives from extracted clause properties, not a category lookup.** For each
flagged clause the analysis extracts the properties that determine severity — for a
non-compete, duration, geographic and industry scope, and whether the restriction is
compensated; for IP assignment, whether it reaches beyond the engagement's deliverable;
for payment terms, whether an acceptance standard is objective or left to the Sender's
judgment — and severity is a function of those properties. This makes severity
explainable and testable at the seam, and it is what makes ADR 0003 real rather than
aspirational.

**The checked-clean list is data, not prose.** v1 carries a defined clause checklist
for freelance contracts. The analysis reports which checklist entries it examined and
found nothing on. Without a real checklist, "checked and came back clean" is not a
claim that can be true or false.

**Red lines are an input to the analysis, not a post-filter.** They change the ranking
and severity of flags rather than hiding rows from a fixed result. A red-lines
implementation that filters output would satisfy the UI but not story 23.

**Jurisdiction is an explicit input, never silently defaulted.** When it isn't known
it must be surfaced to the Signer rather than assumed to be US (ADR 0005). Legal
claims that depend on jurisdiction — enforceability in particular — are stated
relative to it, not as universal fact.

**Only extracted text is stored, never the original file** (`CLAUDE.md`). Per-Signer
isolation is enforced with Supabase Row Level Security so no query can return another
Signer's documents. Model calls go through OpenRouter.

**Unparseable documents are a distinct state from clean documents.** A scanned or
image-only PDF yields no text, and OCR is deliberately excluded. That case must
surface as "this document can't be read," never as an empty result set or a clean
bill — the latter would be the most dangerous possible failure, since it tells a
Signer their contract is fine when it was never examined.

**The landing page is public, static, and processes nothing.** No authentication, no
upload, no model call, no document handling of any kind. Its job is to let a Signer
decide whether to trust the product with a contract, which it cannot do if it is
already asking for one.

**Depicted analysis output is real or it is labelled.** If the page shows a flag with
its source sentence — story 34, and the most persuasive thing the product can show — it
is either generated by the real analysis or plainly marked as an illustration.
Presenting a hand-written mock as genuine output would break the product's central rule
in the first thing a visitor reads, which is a worse failure on the landing page than
anywhere else.

**Every factual claim traces to `PRODUCT.md`'s Evidence on Hand.** That section records
both what is sourced and what must not be fabricated. A claim that cannot be traced to
it does not ship.

**Copy is run through the humanizer skill before it is committed** (`CLAUDE.md`). This
applies to the landing page and to UI labels, error messages and empty states
throughout the product.

**WCAG 2.2 AA**, with severity never encoded by color alone and the path from a flag to
its source sentence reachable by keyboard (`PRODUCT.md`). On the landing page this
matters for story 34 specifically: a demonstration of checkability that a screen reader
user cannot follow is not a demonstration.

**Blocker before implementation:** the trigger for when the product hedges rather than
states plainly is undefined (`PRD.md` §4, ADR 0004). Left undefined, hedging becomes
the default and the output becomes safe and useless. This needs a checkable definition
before the analysis is built, not after.

## Testing Decisions

**What a good test looks like here.** Tests drive the two seams with document text and
assert on the returned structure. No test asserts on prompt text, model identity, or
the sequence of internal calls — those change constantly without the behaviour
changing, and tests coupled to them will be deleted rather than maintained.

**Assertions are on invariants, not exact strings.** Model output varies between runs.
Every criterion below is expressible as an invariant that holds regardless of wording:
a quoted sentence appears verbatim in the source, one document ranks above another, a
refusal occurred, a checklist entry was reported. Any test requiring exact output text
will be flaky and is the wrong test.

**Fixture corpus.** A set of freelance contracts with known planted clauses at known
severities, built specifically for this. There is no prior art — this is the first
code in the repo, so these fixtures become the prior art for everything after.

The criteria from `PRD.md` §4, as tests:

1. **Citation accuracy** — every source sentence appears verbatim in the document
   text. Exact substring assertion. 100%, no tolerance; any failure is a defect.
2. **Severity discrimination within a clause type** — paired fixtures differing only
   in one clause's scope (an IP assignment limited to the deliverable vs. one also
   claiming pre-existing tools) must produce materially different severities. This is
   the test that distinguishes a real analysis from a category lookup.
3. **Recall on planted clauses** — a document seeded with a known dangerous clause
   must flag it. Recall is the tighter constraint and precision the looser one,
   because the product deliberately prefers over-flagging (ADR 0004).
4. **Clean bill** — a genuinely balanced contract yields zero high-severity flags
   *and* a populated checked-clean list. Both halves matter: zero flags with an empty
   checklist is indistinguishable from not having looked.
5. **Q&A refusal** — a fixture set of questions the document does not answer must
   produce explicit refusals, not general legal answers.
6. **Red lines change the ranking** — the same document analysed under two different
   red-line sets must rank differently. Identical output means the feature is
   decorative.
7. **Counter-offer structure** — each counter-offer references the clause language it
   replaces. Whether it is sendable without editing needs human review; no automated
   check is proposed and none is claimed.
8. **Unparseable input** — an image-only PDF returns an explicit unreadable state,
   never an empty or clean result.
9. **Landing page claims** — each factual claim on the page traces to `PRODUCT.md`'s
   Evidence on Hand, and any depicted analysis output is real or labelled as an
   illustration. This is human review; no automated check is proposed and none is
   claimed. Accessibility conformance is partly automatable and partly not — contrast
   and landmark structure can be checked mechanically, but whether the demonstration in
   story 34 is actually followable by a screen reader user cannot be.

## Out of Scope

From `CLAUDE.md`: payments and billing, OCR for scanned documents, sharing a document
between Signers.

From ADR 0002 and `PRD.md` §7: founder/B2B vendor and MSA review, lease review,
consumer ToS review. These are deliberate exclusions, not gaps.

Anything positioned as a substitute for a lawyer. The product explains a document and
drafts language; it does not advise whether to sign. DoNotPay settled FTC charges for
$193,000 plus a ban on advertising itself as a lawyer substitute
(https://www.abajournal.com/news/article/robot-lawyer-website-donotpay-settles-ftc-claims-it-couldnt-deliver-on-promises),
and Redline's counter-offer and Q&A features sit closest to that line.

**Severity thresholds for four checklist clauses.** One-sided indemnity, uncapped
liability, auto-renewal, and unilateral rate or scope change are named in `PRD.md` §5
as checklist members whose dangerous-vs-standard thresholds are not settled. They
belong in the checked-clean list, but this spec does not define their severity rules —
that needs the same treatment the first four clauses got.

Version diffing between contract drafts. Not among the ten capabilities; would need
to be asked about before building (`CLAUDE.md`).

**Marketing claims the product cannot support.** No pricing, testimonials, customer
logos, usage figures, accuracy percentages, or "trusted by" proof. None of these exist,
and `PRD.md` §8 records how thin the evidence base actually is.

**Any second marketing surface** — waitlist, blog, pricing page, changelog. The landing
page is in scope because a Signer needs to know what happens to their file before they
upload it, not because v1 has a marketing programme.

## Further Notes

**Open questions carried in from the brief.**

- The hedging trigger is undefined (see Implementation Decisions). This blocks the
  analysis work.
- How jurisdiction is determined — asked of the Signer, detected from the document, or
  both — is undesigned. `PRD.md` calls this real undesigned scope, and ADR 0005 accepts
  it deliberately as the largest scope decision in v1.
- Story 28 assumes a saved document shows the analysis as stored. Stored analyses and
  current model output will diverge as prompts change. Whether a returning Signer sees
  the stored analysis, a re-run, or both is not decided.
- The landing page has no conversion goal. Stories 32–36 all describe understanding,
  not action, and nothing in the repo says what a Signer is meant to *do* on the page
  or what happens when they do it. `CLAUDE.md` excludes payments, so there is no
  purchase to drive; ADR 0002's segment choice was never converted into an acquisition
  question. This is undesigned, not deliberately absent.
- Stories 32–36 introduce an audience `CONTEXT.md` does not name. A Signer who has not
  uploaded anything is not yet doing the thing the term "Signer" is defined around, and
  "visitor" was deliberately avoided here rather than settled. The vocabulary needs a
  decision.
- Story 34 depends on the analysis existing before it can show real output. The spec
  permits a labelled illustration in the meantime, which is honest but measurably
  weaker proof than the real thing.

**Evidence caveat.** `PRD.md` §8 records that no verified first-person account of a
freelancer harmed by a contract clause exists in the research — the segment choice
rests on willingness-to-pay data and advisory content, not on a documented harm story.
The clause thresholds in this spec are reasoned judgments, not observed failures. The
fixture corpus should be treated as encoding an assumption worth revisiting, not
established fact.

**Publishing.** This spec was not published to an issue tracker because none is
configured. Once `/setup-matt-pocock-skills` has run, it can be published with the
`ready-for-agent` label. Note that at ten capabilities it is an implementation
reference rather than a single unit of agent-ready work. It has since been sliced into
the tickets under `.scratch/redline-v1/issues/`, which are the agent-grabbable unit.
