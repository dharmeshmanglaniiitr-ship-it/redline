# Redline — Product Brief (v1)

Decisions behind this brief live in `docs/adr/0001`–`0007`. Vocabulary is in
`CONTEXT.md`. The research it draws on is in `research/summary.md` and the four
files it summarizes. Where this brief makes a claim the research does not support,
it says so.

---

## 1. Who this is for, and what they do today instead

**The signer: a freelancer or independent contractor reviewing a contract a client
sent them, before signing it.**

Two properties define them, and both are load-bearing:

- **They did not draft the document.** The client's lawyer did, or the client copied
  it from a template. The signer is reading someone else's terms, not negotiating
  from their own.
- **They have leverage.** A freelancer can email back and ask for a change before
  signing. This is what separates them from a renter facing a take-it-or-leave-it
  lease or a consumer clicking a ToS — and it is why the counter-offer feature is
  the product's core value rather than decoration (`docs/adr/0002`).

### What they do today

**They pay a lawyer, sometimes.** ContractsCounsel marketplace data — real completed
projects, not rate-card estimates — puts freelance-specific contract review at an
average **$400 flat fee** ($300 in Colorado), with general contract review at $608
and "most contract review projects... between $250-$600 on a flat fee, as lawyers
typically spend 2-3 hours."
(https://www.contractscounsel.com/b/freelance-contract-review-cost,
https://www.contractscounsel.com/b/contract-review-cost)

**They ask a free legal Q&A site.** A real freelancer asked Avvo, publicly, "Do I
need an indemnity clause in a freelance contract?"
(https://www.avvo.com/legal-answers/do-i-need-an-indemnity-clause-in-a-freelance-contr-5687954.html)
— a person confused about a specific clause, before signing, without a lawyer.

**They read a red-flags checklist written by another freelancer.** A representative
one advises that "one-sided indemnity clauses where you're liable for damages but the
client isn't are unacceptable, as mutual indemnification is the norm."
(https://nobullshitfreelancing.substack.com/p/10-red-flags-to-look-out-for-in-potential)
The existence of a genre of these posts is itself evidence that freelancers are
trying to self-educate rather than pay someone.

**Or they sign it without reading it properly.** This is the assumed majority case
and **the research does not establish it.** No sourced data on what fraction of
freelancers review contracts before signing was found. Treat it as the working
assumption the product is betting on, not a finding.

Cost is the general barrier: Clio's 2018 Legal Trends Report found **42% of consumers
say lawyers are "never affordable," 21% say lawyers "aren't worth" the cost, and 54%
agreed you can "never know how much a lawyer will cost."**
(https://www.clio.com/blog/surprising-finding-legal-trends/) This is
consumer-wide, not freelancer-specific.

---

## 2. The problem

A person signs a document containing a term that will cost them money or rights, and
they do not notice it, because noticing it requires either legal training or paying
someone who has it.

The best-verified first-person account of this mechanism in the research is from an
engineer describing their first startup job offer:

> "work for us for a few years and then we'll get you into a situation where you will
> inevitably fuck up and strip you of vested equity by firing you 'for cause'"
>
> — HN user "ein0p", https://news.ycombinator.com/item?id=39608904

They only caught it because they paid a lawyer to spend two weeks negotiating it out
before signing. **This quote is about an employment/equity agreement, not a freelance
contract.** It is included because it is the clearest verified example of the
mechanism Redline exists to break — a buried clause, invisible without paid expertise,
caught only because expertise was purchased. It is not evidence about freelancers.
See §8 for why no equivalent freelance quote exists in this research.

The same pattern shows up where the harm is documented at scale rather than
individually. The FTC's case against Adobe — settled for **$150 million** — alleged
Adobe hit customers who tried to cancel with "a hefty early termination fee (which was
hidden during the signup process)."
(https://consumer.ftc.gov/consumer-alerts/2024/05/adobe-used-hidden-fee-trap-people-paying-subscription-plans-ftc-says)
And Flo Health "promised not to share sensitive health data with third parties unless
necessary for services," but "the terms of service actually allowed third parties to
use the data for their own purposes unrelated to the app."
(https://www.malwarebytes.com/blog/news/2025/08/meta-accessed-womens-health-data-from-flo-app-without-consent-says-court)

Both are the same failure: **the document permitted something the person signing it
did not know they were agreeing to.**

For a freelancer specifically, the clause types that carry this risk are documented as
risk categories rather than as individual harm stories: broad IP assignment (a
contract may "permanently transfer rights the freelancer didn't realize they were
giving away" — https://flag.red/contract-guides/ip-assignment-in-independent-contractor-agreement),
and uncapped liability, where "you could be held responsible for any and all damages,
losses, or claims arising from your work — without any financial cap"
(https://flag.red/contract-guides/unlimited-liability-for-freelancers).

---

## 3. What the first version does

1. **Accepts an uploaded contract and parses it in the browser.** Only the extracted
   text is sent anywhere or stored. The original file never leaves the signer's
   machine.
2. **Produces a plain-English summary** of what the document commits the signer to.
3. **Flags risky clauses, ranked by severity, each quoting the exact sentence it came
   from.** A flag whose source sentence cannot be shown is not displayed at all — it
   is a bug, not a formatting gap (`docs/adr/0001`).
4. **Reports what was checked and came back clean**, by name, when a document has no
   findings in a checked category — not a generic "looks good" (`docs/adr/0004`).
5. **Drafts a counter-offer for each flagged clause**, written so the signer can send
   it to the client.
6. **Answers questions about the document, from the document only.** When the document
   does not answer the question, it says so rather than answering from general legal
   knowledge.
7. **Lets the signer edit their own red lines**, and re-runs the analysis against
   them, so severity reflects what this signer actually cares about.
8. **Saves past documents to a library** the signer can return to.
9. **Accounts for the document's governing jurisdiction** in severity and
   enforceability claims, rather than asserting US-law assumptions as universal
   (`docs/adr/0005`). Jurisdiction is detected from the document's own governing-law
   clause, overridden by the Signer whenever they say otherwise, and left
   `undetermined` rather than defaulted to US law when neither is available
   (`docs/adr/0007`).

10. **Explains itself to someone who has not signed up yet.** A public landing page
    stating what Redline does, what happens to an uploaded file, and what it is not.
    This is the only surface a Signer sees before deciding whether to hand a
    confidential client contract to a tool they have never used. Added after the nine
    above were settled, and it expands the scope `CLAUDE.md` closed — see §6 for the
    call and what it costs.

Nothing beyond this list. If something looks like the obvious next step and is not on
it, it gets asked about first, not built.

---

## 4. What good looks like

The product's claim is that its analysis can be trusted. These are the checks that
would demonstrate it, specific enough to build fixtures against.

**1. Citation accuracy — 100%, no tolerance.**
Every quoted source sentence must appear verbatim in the uploaded document. Testable
by exact string match against the parsed text. Any miss is a defect, not a
degradation. Paraphrased or reformatted quotes fail this check even when materially
accurate (`docs/adr/0001`).

**2. Severity discriminates within a clause type, not just between types.**
Given two documents differing only in the scope of one clause — an IP assignment
limited to the deliverable vs. one also claiming pre-existing tools and methods — the
tool must assign them materially different severities. A tool that scores both the
same has a category lookup table, not an analysis (`docs/adr/0003`). Build paired
fixtures for each clause type in §5.

**3. Planted dangerous clauses are caught.**
A document seeded with a known clause from §5 at its dangerous threshold must produce
a flag for it. Measured as recall against a fixture set. Because the product prefers
over-flagging (`docs/adr/0004`), recall is the harder constraint and precision the
softer one.

**4. A fair contract produces a clean bill, not manufactured findings.**
Given a genuinely balanced contract, the tool must return no high-severity flags and
an explicit list of what it checked. A tool that always finds something to flag fails
this test even when its flags are technically defensible.

**5. Q&A refuses to answer what the document does not say.**
Asked a question the document does not address ("what happens if the client goes
bankrupt?" against a contract silent on insolvency), the answer must be that the
document does not say — not a general legal answer. Testable with a fixture set of
unanswerable questions.

**6. Counter-offers are sendable.**
Each counter-offer must reference the specific clause language it replaces (testable
structurally) and be usable without editing (requires human review — no automated
check proposed). If a freelancer would have to rewrite it before sending, it has
failed.

**7. Severity moves when red lines change.**
Editing the signer's red lines must measurably change the ranking on the same
document. If the output is identical before and after, the red-lines feature is
decorative.

**8. The landing page claims nothing the product cannot show.**
No invented customers, testimonials, benchmarks, usage numbers, or pricing — none of
these exist (§8). Any analysis output depicted on the page is either produced by the
real system or labelled as an illustration; a mocked-up flag presented as real output
would be the product breaking its own central rule in the first thing a visitor reads.
Testable by review against `PRODUCT.md`'s Evidence on Hand: every factual claim traces
to a sourced fact or to something the product demonstrably does. This is test 1 turned
on the product's own marketing — state only what you can show.

**When the product hedges:** `docs/adr/0006` settles the trigger `docs/adr/0004` left
open. Redline hedges a finding exactly when at least one of the properties its severity
function consumed is not stated in the document, and the hedge has to name the missing
property. Every other finding is stated plainly. Because the properties are enumerated
per clause type (§5), this is checkable against a specific finding rather than judged by
feel, and it does not depend on the model reporting its own confidence.

---

## 5. Red lines: what gets flagged, how severely, and why

Severity comes from what a clause actually says, not from which category it belongs
to (`docs/adr/0003`). The same clause type ranges from unflagged to high depending on
its scope.

### Settled thresholds

**Payment approval left to the client's subjective judgment — highest severity.**
Language gating payment on the client's "satisfaction" with no defined acceptance
criteria. This ranks above everything else because it lets a client withhold payment
for work already delivered, with no objective standard to appeal to. It is a realized
loss of money already earned, not a loss of future opportunity.

**IP assignment reaching beyond the deliverable — high severity.**
Assignment that claims the freelancer's pre-existing tools, methods, or IP created
outside the engagement, or is worded broadly enough to cover future or unrelated work.
Standard "the client owns what I built for them" is expected in freelance work and is
flagged low or not at all — flagging it high would be crying wolf on the majority of
legitimate contracts.

**Termination for convenience with no kill fee — flagged, below subjective payment.**
The client can end the engagement at any time with no payment for the remaining
commitment. Real, but ranks below subjective payment approval: it costs expected
future income rather than money already earned.

**Non-compete / non-solicit — severity by trigger, not by presence.**
High when duration exceeds roughly 6–12 months, when scope is industry-wide or
geographically broad, or when there is no separate compensation for the restriction.
A narrow, short, compensated restriction is common and ranks lower. Note that
enforceability reasoning here is jurisdiction-dependent and must not be stated as
universal (`docs/adr/0005`, and `docs/adr/0007` for the list of claims that rule
covers).

### In the checklist, thresholds settled later

These must be in the checked-and-clean list (§3 item 4, §4 test 4) or the clean bill
is not a real claim. Their dangerous-vs-standard thresholds were not set here and were
settled afterwards in `docs/adr/0008`, which gives each one the same treatment as the
four above and records the evidence behind it — including, for two of them, that there
is barely any. What this section records is the evidence as the research left it:

- **One-sided indemnity** — the freelancer indemnifies the client but not vice versa.
  Sourced as a recurring freelancer red flag
  (https://nobullshitfreelancing.substack.com/p/10-red-flags-to-look-out-for-in-potential)
  but with only one sourced individual instance
  (https://www.avvo.com/legal-answers/do-i-need-an-indemnity-clause-in-a-freelance-contr-5687954.html).
- **Uncapped liability** — no financial ceiling on the freelancer's exposure. The
  research found only risk-education content for this, no sourced individual harm.
- **Auto-renewal** — relevant to retainer and ongoing-engagement contracts. This is
  the single best-evidenced clause danger in the research overall (FTC v. Adobe,
  $150M; ~100,000 FTC complaints in five years), though that evidence is consumer
  subscriptions, not freelance retainers.
- **Unilateral rate or scope change** — the client can alter fees or deliverables
  without the freelancer's agreement.

---

## 6. The calls made, and what was given up

**Freelancers, not startup founders.**
Chose against the only segment in the research with hard proof of existing spend:
$300–500/hr for outside counsel, $8,000–15,000 per quarter for a 30-person startup,
and one founder describing "Three days and $1,200 later" for a single vendor agreement
review (https://www.tycoonstory.com/how-ai-contract-review-software-is-cutting-legal-costs-for-startups/).
**Worse off:** founders and small-business owners without in-house counsel, who have
both documented pain and documented budget, and get nothing from v1. The reasoning is
that their use case — vendor contracts and MSAs — is closer to what Spellbook, LegalOn
and Ironclad already serve, imperfectly but adequately. If that reasoning is wrong,
this is the most expensive call in the brief.

**Signers with leverage, not signers without it.**
Chose against renters, first-time employees, and consumers accepting a ToS.
**Worse off:** the people with the least power and, arguably, the most exposure — a
renter facing a take-it-or-leave-it lease, a junior employee with a bad offer letter.
The research suggests they may not act on better information anyway: on Blind, tech
workers dismissed lawyer review of offer letters because "he can't do shit against
lawyers of Google Apple Amazon"
(https://www.teamblind.com/post/do-you-get-your-offer-letters-reviewed-by-a-lawyer-why-mvvwh8hf).
That is a rationalization of the choice, not a justification: it is an observation
about employees, not renters, and low leverage is a reason someone needs to understand
what they signed, not a reason to skip helping them.

**Severity from specificity, not from category.**
Chose against a per-category lookup table, which would have been simpler to build,
explain, and test. **Worse off:** the build itself — the model must reason about
clause scope sentence by sentence, which is harder to get right and harder to verify.
The alternative would have flagged standard boilerplate as dangerous and missed
non-standard instances that do not fit their category's stereotype.

**Over-flag rather than miss.**
Chose against protecting the product's authority by staying quiet when unsure.
**Worse off:** the signer who dismisses unnecessary flags, and — more seriously — any
signer who becomes desensitized if the over-flagging is badly calibrated. The
justification is that every flag carries its source sentence, so a false positive is
checkable and self-correcting in a way a false negative never is.

**Hedge when genuinely uncertain, rather than always sounding confident.**
Chose against maximum decisiveness. **Worse off:** the signer who wanted a clear answer
and gets "this may be concerning." This call was made against the recommendation, and
the risk it carried — hedging drifting toward the default until the product is safe and
useless — is now closed off by `docs/adr/0006`, which ties hedging to a named property
the document does not state and forbids a hedge that cannot say what is missing.

**A specific clean bill, not a short all-clear.**
Chose against brevity. **Worse off:** nobody meaningfully; the cost is output length
and the obligation to maintain a real checklist per document type.

**Jurisdiction-aware from v1, not US-only first.**
Chose against proving the analysis works in a single legal framework before
generalizing. **Worse off:** everyone, in timing — v1 ships later, and the core
analysis stays unproven while jurisdiction handling gets built. This expanded
CLAUDE.md's committed scope and was confirmed deliberately after being pushed back on
twice. It is the largest scope decision in the brief and the one most likely to be
worth revisiting if v1 runs long. How jurisdiction is determined, which ADR 0005 left
undesigned, is settled in `docs/adr/0007`: detected from the governing-law clause,
overridden by the Signer, `undetermined` when neither is available.

**A public landing page, not the signed-in product alone.**
Chose against shipping only the thing v1 exists to prove. **Worse off:** the analysis,
in timing — v1 grows by a surface that demonstrates nothing about whether the flags are
correct, and every hour spent on it is an hour not spent on the citation and severity
work that carries the product's claim. The reasoning is that the first thing Redline
asks a Signer to do is hand over a confidential client contract, and nothing currently
tells them what happens to it beforehand. The strongest fact the product has — the file
is parsed in the browser and never stored — is invisible until someone has already
decided to trust it. That is a trust problem sitting in front of a product whose entire
purpose is to be trustworthy. This is the second expansion of `CLAUDE.md`'s closed
scope, after jurisdiction, and the same caution applies: it was asked for and confirmed,
not assumed.

---

## 7. What we are not building, and why

**OCR for scanned documents.** A citation is worthless when the text it points at was
misread. OCR would actively undermine the one property the product is built to prove
(`CLAUDE.md`, `docs/adr/0001`).

**Payments and billing.** Nothing about charging for the product makes the analysis
more trustworthy, which is the only thing v1 exists to establish.

**Sharing a document between users.** Same reason. It is a collaboration feature, not
a trust feature.

**Founder/B2B MSA and vendor contract review.** Deliberately out of scope per
`docs/adr/0002`, not an oversight. Expanding here later is a decision, not scope creep.

**Lease review and consumer ToS review.** Both were named in the original product
hypothesis. Both are excluded from v1: leases because the research found no evidence
at all for them (§8), ToS because the signer cannot negotiate, which makes the
counter-offer feature — the core of v1's value — inapplicable.

**Anything positioned as a substitute for a lawyer.** DoNotPay was charged by the FTC
in September 2024 for marketing itself as a lawyer substitute without ever testing
whether its output matched a lawyer's, settling for $193,000 plus a ban on advertising
the service that way
(https://www.abajournal.com/news/article/robot-lawyer-website-donotpay-settles-ftc-claims-it-couldnt-deliver-on-promises).
Redline's counter-offer and Q&A features sit closest to that line. The product
explains a document and drafts language; it does not advise on whether to sign.

Note what DoNotPay was actually sanctioned for: *marketing*. The claim, not the code.
That makes the landing page — now in scope per §3 item 10 — the single highest-risk
surface in v1 for this specific failure, not a low-stakes one.

**Marketing claims the product cannot support.** No pricing, testimonials, customer
logos, usage figures, accuracy percentages, or "trusted by" proof of any kind. None of
these exist, and §8 records exactly how thin the evidence base is. A landing page that
manufactures them would be the same defect as a flag without a source sentence, in the
first thing a visitor reads.

**A waitlist, blog, pricing page, or any second marketing surface.** One page. The
landing page is in scope because a Signer needs to know what happens to their file
before they upload it, not because v1 has a marketing programme.

---

## 8. What the research could not tell us

These are gaps, not findings. Each one is a place this brief is running on assumption.

**No verified first-person account of a freelancer harmed by a contract clause.**
The research pass looking for individual pain quotes exhausted its full budget and
verified only **two** first-person accounts, both from Hacker News, both about
employment/equity agreements. Direct fetches to Reddit were blocked and DuckDuckGo
returned CAPTCHAs, so r/freelance and similar were never reached. The freelance
segment's case rests on willingness-to-pay data and advisory content, not on a single
verified story of someone being burned. **This is the most important gap in the brief**
— the chosen segment is the one with the least direct evidence of harm.

**Nothing at all on leases.** Zero individual pain quotes, zero willingness-to-pay
data for pre-signing lease review, across all four research passes. One of the four
document types in the original hypothesis has no evidence behind it whatsoever.

**No evidence anyone pays for a *tool* rather than a lawyer.** The $400 benchmark is
what freelancers pay lawyers. Whether they would pay anything for software that does
this is not established anywhere in the research.

**Whether better information changes behavior for low-leverage signers.** The Blind
thread suggests employees skip review because they do not believe it changes outcomes.
Whether that generalizes to freelancers — who do have leverage — is unknown.

**Thin evidence for two clause types now in the checklist.** Uncapped liability and
unilateral termination surfaced only as risk-education and law-firm explainer content.
No sourced individual complaint or incident was found for either.

**The competitive whitespace claim is inferred, not confirmed.** No product was found
combining all of Redline's features for an individual signer, but the research budget
ran out before reaching LawGeex, Kira/Zuva, or consumer browser extensions. "No
competitor found" means the search was incomplete, not that the space is empty — and
it does not distinguish between nobody having tried and people having tried and
failed.

**No data on gig workers or small SaaS buyers** as distinct segments, despite targeted
searches.
