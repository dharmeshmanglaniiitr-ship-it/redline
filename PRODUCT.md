# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Settled in `CLAUDE.md` and not open for reinterpretation: Next.js (TypeScript, App
Router) with Tailwind CSS, deployed on Vercel. Supabase for authentication and
database. Model calls go through OpenRouter. Uploaded files are parsed in the browser
and only the extracted text is ever stored.

The repository has no scaffold yet — the first ticket creates it. The stack was decided
by the user before this record existed; it was not delegated.

## Users

The **Signer**: a freelancer or independent contractor reviewing a contract a client
sent them, before signing it.

Two properties define them, and both are load-bearing. They did not draft the document —
the client's lawyer did, or the client pulled it from a template, so the Signer is
reading someone else's terms rather than negotiating from their own. And they have
**Leverage**: a freelancer can email back and ask for a change before signing. That
second property is why the drafted counter-offer is the product's core value rather than
decoration.

The other party is the **Sender** — whoever drafted the document and gave it to the
Signer. For v1 that is normally the Signer's client.

Deliberately not designed for in v1: startup founders and small businesses reviewing
vendor contracts and MSAs, renters signing a lease, and consumers accepting a ToS. These
are decisions recorded in ADR 0002, not oversights. The consumer and renter cases fail
on Leverage; the founder case is closer to what enterprise tools already serve.

## Product Purpose

A person signs a document containing a term that will cost them money or rights, and
they do not notice it, because noticing it requires either legal training or paying
someone who has it. Redline reads a document someone else drafted and tells the person
about to sign it what they are actually agreeing to.

Success is narrow and specific: v1 exists to establish that the analysis can be trusted.
Not that it is comprehensive, not that it is profitable — that a Signer can check every
claim it makes against their own document and find it holds. Everything excluded from v1
was excluded because it does not serve that.

## Positioning

Redline cites its work. Every risk flag quotes the exact sentence it came from, verified
by string match against the document before display, so a Signer can find it in their own
contract and confirm the product is not inventing it. A flag whose source cannot be shown
is not displayed at all.

That is the claim a neighboring product cannot truthfully copy without building the same
constraint into its output. It also sets the boundary the product lives inside: Redline
explains a document and drafts language, and does not advise whether to sign.

Severity is the second differentiator. It comes from what a clause actually says — how
far an IP assignment reaches past the deliverable, whether a payment standard is objective
or left to the Sender's judgment, how long and broad and uncompensated a restriction is —
rather than from a per-category lookup table. The same clause type ranges from unflagged
to high depending on its wording.

## Operating Context

A contract arrives from a client, usually by email, usually as a PDF or DOCX, often with
a start date already discussed. The Signer wants to know what is in it before replying.
What they do instead today: pay a lawyer, at an average $400 flat fee for freelance
contract review; ask a free legal Q&A site; read a red-flags checklist written by another
freelancer; or sign it without reading it properly.

The product's output has a destination outside the product. A counter-offer exists to be
pasted into a reply to the client, which is why sendability without rewriting is the bar
rather than plausibility.

The documents are confidential client work. A Signer's library must be theirs alone,
enforced at the database rather than by application filtering.

**Device shape: desktop in, read anywhere.** Upload and analysis are designed for a
laptop, where the contract file already lives and browser-side parsing of a large PDF is
safe. Returning to a saved document in the library works properly on a phone.

## Capabilities and Constraints

Ten capabilities, closed. Anything that looks like the obvious next step and is not on
the list gets asked about before it is built.

1. Accepts an uploaded contract and parses it in the browser; only extracted text leaves
   the machine.
2. Produces a plain-English summary of what the document commits the Signer to.
3. Flags risky clauses ranked by severity, each quoting its exact source sentence.
4. Reports by name what was checked and came back clean, rather than a generic all-clear.
5. Drafts a counter-offer per flagged clause, written to be sent as-is.
6. Answers questions about the document from the document only, and says so when the
   document does not answer.
7. Lets the Signer edit their own red lines, which re-rank the analysis as an input
   rather than filtering the output.
8. Saves past documents to a library.
9. Accounts for the document's governing jurisdiction in severity and enforceability
   claims rather than asserting US assumptions as universal.
10. Explains itself on a public landing page, so a Signer learns what happens to their
    file before uploading a confidential client contract rather than after.

**Hard constraints.** No OCR — a citation is worthless when the text it points at was
misread, so an unreadable document must surface as unreadable and never as a clean bill.
The original file is never stored. Row Level Security isolates each Signer's documents.
Credentials stay in a gitignored environment file.

**Terminology.** Signer, Sender, and Leverage are defined in `CONTEXT.md` and used
consistently in the product and the repository. Avoid "user", "counterparty", and
"bargaining power".

**Settled since this was written.** Redline hedges a finding exactly when one of the
properties its severity judgment relied on is not stated in the document, and the hedge
names that property (`docs/adr/0006`). The governing jurisdiction is detected from the
document's own governing-law clause, overridden whenever the Signer says otherwise, and
left undetermined rather than defaulted to US law (`docs/adr/0007`).

**Explicitly undecided.** Severity thresholds for one-sided indemnity, uncapped
liability, auto-renewal, and unilateral rate or scope change are unsettled. Whether a
returning Signer sees a stored analysis or a fresh re-run is not decided.

**Out of scope on purpose:** payments and billing, sharing a document between Signers,
version diffing between drafts, and anything positioned as a substitute for a lawyer.

## Brand Commitments

The name is **Redline**. No logo, wordmark, or brand assets exist yet.

**Voice: direct, with a point of view.** Redline has a view about a clause and states it,
in confident plain language rather than hedged legal register. This follows from the
product's own decisions — it over-flags rather than stays quiet, and it gives a specific
clean bill rather than a vague all-clear, both of which require a product willing to say
something. It hedges only where the contract leaves out something its judgment depended
on, and then it says which thing (`docs/adr/0006`).

The voice has a hard edge it must not cross. Having a point of view about a clause is not
the same as advising whether to sign, and the two are easy to blur in exactly the places
the product is closest to regulatory risk. DoNotPay was FTC-sanctioned in 2025 for
marketing an AI tool as a lawyer substitute without testing its output against a lawyer's;
Redline's counter-offers and Q&A sit nearest that line.

**All copy a Signer reads is held to the same standard as the analysis.** Per `CLAUDE.md`,
the landing page, UI labels, error messages and empty states are run through the humanizer
skill before being committed. Copy that reads as though a model wrote it is a defect, not
a matter of taste.

## Evidence on Hand

Four research passes are in `research/`, synthesized in `research/summary.md`. Everything
sourced carries a URL. What is real and citable:

- Freelance contract review averages **$400** as a flat fee on the ContractsCounsel
  marketplace — actual completed transactions, not rate-card estimates. General contract
  review averages $608.
- Clio's 2018 Legal Trends Report: 42% of consumers say lawyers are "never affordable",
  54% say you can never know what a lawyer will cost. Consumer-wide, not
  freelancer-specific.
- FTC v. Adobe, settled for $150M over a hidden early-termination fee; roughly 100,000
  FTC complaints in five years about auto-renewal practices.
- DoNotPay's $193,000 FTC settlement plus a ban on advertising itself as a lawyer
  substitute.
- One verified first-person account of a buried clause caught only by paid legal help — an
  HN commenter describing an equity agreement, not a freelance contract.

**What must not be fabricated, because the research could not establish it.** There is no
verified first-person account of a freelancer harmed by a contract clause anywhere in this
research; the segment choice rests on willingness-to-pay data and advisory content. There
is no evidence anyone pays for a *tool* rather than a lawyer. There is nothing at all on
leases. Uncapped liability and unilateral termination surfaced only as risk-education
content with no sourced individual incident. The competitive whitespace claim is inferred
from an incomplete search, not confirmed.

No customers, testimonials, benchmarks, pricing, or deployment exist. Future work states
none of these.

## Product Principles

1. **Every claim is checkable.** A flag carries its source sentence, a clean bill names
   what was checked, a legal claim names the jurisdiction it assumes. Anything a Signer
   has to take on trust has failed.
2. **State only what the document says.** Where the text does not support a claim, the
   product does not make it, and silence in a contract is reported as silence rather than
   answered from general legal knowledge.
3. **Read the clause, not the category.** Severity comes from the specific wording's
   scope. Treating a clause type as inherently dangerous cries wolf on boilerplate and
   misses the instances that do not fit the stereotype.
4. **Over-flag rather than miss.** A false positive costs a Signer seconds and corrects
   itself, because the source sentence is right there. A false negative costs them money
   or rights with no warning.
5. **Explain and draft; never advise.** The product says what a clause would cost and
   offers language to change it. Whether to sign is the Signer's call, and saying
   otherwise is both wrong and a documented regulatory risk in this category.

## Accessibility & Inclusion

**WCAG 2.2 AA.** Three product-specific consequences follow, because this is a
dense-text product whose whole value is a link between a claim and its evidence:

- Severity must never be carried by color alone. The ranking is the primary information
  in the flag list, so it needs a non-color encoding that survives both color blindness
  and a grayscale print.
- The path from a flag to its source sentence must be fully reachable by keyboard and
  announced meaningfully to a screen reader. A citation a Signer cannot navigate to is a
  citation they cannot check, which fails the product's core claim rather than a
  compliance checkbox.
- Contract text is long and dense. Reflow, zoom to 200%, and generous text spacing have
  to hold without trapping content in a fixed pane.
