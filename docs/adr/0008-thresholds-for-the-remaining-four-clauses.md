# 8. Thresholds for the four remaining checklist clauses

## Decision
`PRD.md` §5 settles dangerous-vs-standard thresholds for four clause types and leaves
four on the checklist with none: one-sided indemnity, uncapped liability, auto-renewal,
and unilateral rate or scope change. This settles those four, in the same shape as the
first four and under the same constraint from ADR 0003 — severity comes from specific,
checkable properties of the wording, never from the category the clause belongs to.
"One-sided indemnity is medium" is not a threshold. What follows is.

Each of the four gets: the properties its severity function reads, what separates a
dangerous instance from a standard one, where it ranks against the settled four and why,
which part of the reasoning depends on the governing law, and how strong the evidence
actually is. The last of those is not a footnote. Two of these four rest on evidence
`PRD.md` §8 records as thin, and one rests on evidence about a different population
entirely, and pretending otherwise would be a worse outcome than leaving them open.

Because every property named here is something a document can be silent on, ADR 0006
applies to all of them without amendment: a property the contract does not settle is read
at its dangerous end, the finding is hedged, and the hedge names the gap.

---

### One-sided indemnity

**Properties.** `mutual` — does the client promise the signer the same cover the signer
promises the client. `triggeringClaims` — the contract's own words for what sets the
promise off. `cappedByLiabilityLimit` — does the promise sit inside the contract's limit
of liability, or is it carved out of it.

**Dangerous.** Either of two properties, on its own:

- The promise fires on claims the signer did not cause — "any claim arising out of or in
  connection with the Services", "whether or not the Contractor was at fault". An
  indemnity confined to the signer's own breach, negligence or infringement is a promise
  about their own conduct; one that is not is a promise about the client's business.
- The promise is carved out of the liability ceiling. That is the mechanism that turns a
  fee-sized engagement into an open-ended debt, and it is usually one clause away from
  the ceiling that would otherwise have held it.

A phrase that states a confinement and then takes it back is not a confinement: "to the
extent it arises from the Services, regardless of fault" reads as reaching.

**Standard, and deliberately not flagged high.** An indemnity running one way only,
confined to the signer's own fault, held inside the ceiling. This is what a large share
of legitimate freelance contracts say — the client wants cover against the signer using
a font they did not license — and marking it high is the crying-wolf failure ADR 0003
exists to prevent. It is still flagged, at 2, because one-sidedness is worth knowing.

**Rank: 3, dropping to 2 when only `mutual` fires.** Alongside IP overreach and a broad
restriction, not above them, and below subjective payment approval. Payment approval
keeps 4 because it withholds money already handed over — a realised loss, certain at the
moment the clause is used. An indemnity is a contingent exposure: real, potentially far
larger than the fee, and dependent on a third party doing something first. This is the
first clause type whose severity depends on *which* property fired rather than on whether
any did, which is what ADR 0003 anticipated when it said the same clause type ranges from
unflagged to high.

There is a case for putting an uncapped indemnity at 4 on size of exposure alone, and it
was rejected: `PRD.md` §5 gives 4 to payment approval on the grounds that it ranks above
everything else, and that ordering was settled on interview evidence this decision does
not have.

**Jurisdiction-dependent.** Whether an indemnity is limited or overridden by statute is
on ADR 0007's list, so the finding says whose law answers it and never answers it itself.
What the clause *says* — one way or mutual, fault-based or not, inside the ceiling or
outside it — is textual and reads the same everywhere.

**Evidence: weak.** `PRD.md` §5 sources this as a recurring freelancer red flag in
advisory content, with exactly one sourced individual instance behind it. The properties
above are reasoned from how the clause works, not from any recorded harm.

---

### Uncapped liability

**Properties.** `liabilityCap` — the ceiling the contract puts on what the signer could
be made to pay, in the contract's own words. `capAppliesToSigner` — does that ceiling
limit the signer's liability, or only the client's. `capProportionateToFee` — is the
ceiling tied to the fees under this agreement, or to a figure with no relation to them.

**Dangerous.** Any one of the three:

- No ceiling, or a ceiling stated in words that are not one: "unlimited", "no limit",
  "all losses howsoever arising".
- A ceiling that limits the client and not the signer. This is the common asymmetric
  shape and it is easy to miss, because the clause looks like a limitation-of-liability
  clause and reads as protective.
- A ceiling set far above what the job pays. A €5,000,000 limit on a €2,400-a-month
  retainer is a ceiling in name only.

**Standard.** A limit tied to the fees, applying to both parties. Not flagged above 1.

**Rank: 3.** Same reasoning as the indemnity: a contingent exposure, ranked with the
clause types that cost the signer rights and future work rather than earned money.

**A contract that says nothing about liability produces no flag at all.** ADR 0001
already decides this and it matters most here, because most short freelance contracts are
silent on liability and reading that silence as a finding would flag nearly every
document the product sees. Silence about a whole clause has no sentence to quote, so
there is nothing to flag; silence about a property of a clause that *is* there is
ADR 0006's case, and is hedged. The distinction is load-bearing for this clause type
specifically.

**Jurisdiction-dependent.** Whether a cap stands or is overridden by statute is on
ADR 0007's list. Several jurisdictions void limits on some kinds of liability outright,
which changes what an uncapped clause actually exposes the signer to; none of that is
asserted, only attributed.

**Evidence: weakest of the four, and `PRD.md` §8 says so in as many words.** Uncapped
liability surfaced in the research only as risk-education and law-firm explainer content.
No sourced individual complaint or incident was found. The threshold above is a reasoned
judgment about a mechanism, and should be read as an assumption worth revisiting rather
than as a finding.

---

### Auto-renewal

**Properties.** `renewalTermMonths` — how long each further term runs.
`noticeWindowDays` — how far ahead of the renewal date the signer has to give notice to
stop it. `terminableDuringRenewal` — can the signer end a renewed term before it expires.

**Dangerous.** Any one of the three:

- A renewal running longer than six months.
- A notice window longer than thirty days, which is the trap the consumer evidence is
  actually about: the decision comes round a quarter before the term ends, when nobody is
  thinking about it, and missing it is what commits the signer again.
- A renewed term the signer cannot leave part-way through.

**Standard.** Renewal in short steps, stoppable on ordinary notice, leavable part-way
through. Not flagged above 1. A contract that says it does not renew clears the checklist
entry and produces no flag.

**Rank: 2.** Beside termination for convenience, and for the mirror-image reason.
`PRD.md` §5 puts termination at 2 because it costs expected future income rather than
money already earned; a renewal costs the same currency from the other direction — it
holds the signer to terms they would have renegotiated. Neither touches money already
handed over, which is what separates both from 4.

**The two numbers above are calibrations, not findings.** Six months and thirty days are
chosen by analogy with the 6–12 month window `PRD.md` §5 draws for restrictive covenants.
Nothing in the research sets either number. They are asserted in a test so that changing
one is a deliberate act rather than a quiet edit.

**Jurisdiction-dependent.** Whether an auto-renewal requires its own notice or consent to
be effective is on ADR 0007's list. Some jurisdictions require a separate reminder before
a renewal binds; that is stated as a question for the governing law, never as an answer.

**Evidence: the strongest in the research, and about the wrong population.** `PRD.md` §5
records auto-renewal as the single best-evidenced clause danger in the whole research —
FTC v. Adobe at $150M, roughly 100,000 FTC complaints in five years. Every bit of that is
consumer subscriptions. None of it is a freelance retainer, and nothing establishes that
a freelancer signing a retainer is harmed the way a consumer signing a subscription is.

That asymmetry is why the rank sits at 2 rather than higher. Evidence strength says how
confident to be that a clause type matters to the segment; ADR 0003 says severity comes
from the properties of the wording. Importing consumer-subscription harm into a freelance
rank would be using the first to answer the second, and it is the specific mistake the
volume of that evidence invites.

---

### Unilateral rate or scope change

**Properties.** `changeRequiresSignerAgreement` — does a change take effect only once the
signer has agreed to it in writing. `whatMayChange` — the contract's own words for what
may be changed. `exitOnChange` — may the signer end the agreement, without penalty,
because of a change.

**Dangerous.** A change that takes effect without the signer's agreement, and reaches the
money or the work: the fee, the rate, the scope, the services, the deliverables. That is
the bargain being rewritten after it was struck. When the power exists but reaches only
operating detail — where invoices go, which brand guide applies — the finding drops to 2.

**Standard.** A change-order clause: changes take effect once both parties have signed
for them. Not flagged above 1.

**One property gates the others, and this is the only clause type where that happens.**
When a change needs the signer's signature, what the clause lists as changeable and
whether there is a way out are answers to a question nobody is being asked, so neither
fires. Reading both at their dangerous end still lands at 1, so ADR 0006 holds: the gap
is read at its worst and the worst is still nothing to raise. Without the gate this
clause type would flag every contract that has a changes section, which is most of them.

**Rank: 3, dropping to 2 when the power reaches only operating detail.** Above
auto-renewal, which holds the signer to the deal they agreed, and above termination,
which ends it. Below payment approval, because it operates prospectively and with notice,
on work not yet done, rather than withholding payment for work already delivered.

**Jurisdiction-dependent: nothing.** ADR 0007 requires that adding a legal claim means
deciding which side of the line it falls on, and the decision here is not to make one.
The finding says what the clause does, in the signer's terms, and stops. Whether a
unilateral variation clause survives an unfair-terms challenge is a real question and a
jurisdiction-dependent one; it is not asked, so it is not answered, and this clause
carries no attribution line. If that commentary is ever added it falls on the
jurisdiction-dependent side and must be attributed like the rest.

**Evidence: thin, and thinner than the indemnity's.** `PRD.md` §5 names this as a
checklist member without sourcing it to anything at all — no advisory content, no
individual instance. It is here because it is the obvious fourth member of the set, and
the threshold is reasoned entirely from the mechanism.

---

## Alternatives
- **Leave the four unsettled and keep them checklist-only.** The state ticket 09 shipped,
  and honest as far as it went: the entries could be examined and reported clean, just
  never flagged. Rejected because it leaves a real hole in the clean bill's meaning — a
  clause found under one of these landed in neither list, so the screen made no claim
  about it either way, and a Signer had no way to tell that from a clean line.
- **A fixed severity per clause type, given how thin the evidence is.** Tempting
  precisely because the evidence does not support fine distinctions. Rejected: it is the
  category lookup ADR 0003 exists to forbid, and the thinness of the evidence is an
  argument for saying so plainly, not for making a cruder judgment quietly.
- **Defer auto-renewal until there is freelance evidence for it.** Defensible — the whole
  evidence base for it is consumer subscriptions. Rejected because the clause type is
  already on the checklist and already examined, so deferring the threshold would keep the
  hole above open for the one clause type the research has most to say about.
- **Rank uncapped liability and one-sided indemnity at 4.** The exposure can dwarf
  everything else in the contract. Rejected: `PRD.md` §5 gives 4 to payment approval as
  ranking above everything else, on interview evidence; overturning that on a mechanism
  argument alone would be substituting reasoning for the only clause ordering in this
  product that has evidence behind it.
- **Fold indemnity and liability into one clause type.** They are two halves of one
  exposure and a dangerous contract usually has both. Rejected because they are separately
  negotiable and separately cited: a Signer asking for a cap and a Signer asking to narrow
  an indemnity are sending two different sentences back.

## Why
The first four thresholds were settled from interview evidence. These four cannot be, and
the honest response is to reason from the mechanism and label the result as reasoning.
What makes that safe rather than reckless is the same machinery every other finding uses:
each threshold is a property of the wording, the property is quoted from a sentence the
Signer can find in their own contract (ADR 0001), silence about a property is hedged and
named (ADR 0006), and no legal effect is asserted without an owner (ADR 0007). A Signer
disagreeing with one of these thresholds can see exactly what it read and exactly which
sentence it read it from.

The specific danger this decision had to avoid is the auto-renewal one. It is the
best-evidenced clause danger in the research by a wide margin, and every piece of that
evidence is about a different population. Volume of evidence is the most persuasive thing
in a brief and the least relevant thing to a severity ordering, and a decision written
without naming that would have quietly let the FTC's complaint count set a rank.

## Consequences
- `SETTLED_CLAUSE_TYPES` and `CHECKLIST_ENTRIES` now hold the same eight. They stay two
  lists, because a clause type still earns the checklist and the flag list by two
  different claims made at two different times.
- Ticket 09's honest limit closes with no change to `lib/analysis/checklist.ts`: a flag
  under one of these four now overturns a clean claim the same way the others do.
- Two clause types derive severity from which property fired rather than whether one did.
  `deriveSeverity` is no longer one severity per clause type, and the tests assert the
  drop as well as the peak.
- The unilateral-change gate is the first case of a property whose value suppresses its
  own clause type's other triggers. It is explained where it lives; a second one should be
  looked at hard before it is added, because the pattern can hide a finding.
- Four of the eight clause types now carry an attributed legal claim rather than one. The
  attribution is written in one place (`lawDecides`), so a fifth is a call, not a
  new mechanism.
- Six months, thirty days and the fault-confinement wordlists are calibrations with
  nothing behind them but reasoning. They are the first thing to revisit when there is
  real freelance evidence, and the tests name them so that revisiting is deliberate.
- `PRD.md` §5's "thresholds not yet set" subsection is now a pointer here rather than an
  open question, and the four clause types come out of `docs/spec-v1.md`'s Out of Scope.
