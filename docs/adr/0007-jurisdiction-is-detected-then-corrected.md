# 7. Jurisdiction is detected from the document, corrected by the Signer, and never silently defaulted

## Decision
ADR 0005 commits Redline to accounting for the law governing a document and leaves open
how the governing jurisdiction is determined. It is both detected and asked, with a
precedence order:

1. **Detect first**, from the document's own governing-law clause. That clause is
   citable text, so detection carries the quoted sentence as its evidence exactly as a
   flag does under ADR 0001. Jurisdiction is never guessed from the Signer's locale, the
   language of the document, or the currency.
2. **The Signer always wins.** An explicit choice overrides detection, always and
   without friction. The Signer knows things the document does not say.
3. **When it cannot be determined it is `undetermined`, never US.** A silent default to
   US law is the specific failure ADR 0005 was written to prevent.

**While jurisdiction is undetermined the analysis still runs.** Refusing to analyse a
pasted contract because it has no governing-law clause would be hostile, and is not what
the Signer came for. It degrades in one place only:

- **Severity still stands.** Under ADR 0003 severity derives from properties of the
  clause's own wording, which are textual facts rather than legal conclusions. An
  unknown jurisdiction does not change what the sentence says.
- **Jurisdiction-dependent claims are withheld, not guessed.** The enforceability
  commentary is replaced by a plain statement that it depends on the governing law,
  which this contract does not state, together with the means to set it.

**When detection and the Signer disagree, the Signer's choice governs the analysis.**
Both are shown and the disagreement is stated plainly rather than silently resolved — a
governing-law clause naming a forum far from where the Signer works is a real feature of
the deal they should see. This does not become a new flag type; it is surfaced in the
masthead, not added to the findings list.

**These claims are jurisdiction-dependent** and must be stated relative to the governing
jurisdiction rather than as fact:

- Enforceability of a non-compete or non-solicit.
- Effect and enforceability of an arbitration clause or class-action waiver.
- Whether a liability cap or an indemnity is limited or overridden by statute.
- Whether an auto-renewal requires specific notice or consent to be effective.
- Worker-classification consequences of the engagement's terms.
- Statutory prompt-payment or late-payment protections.
- Whether assignment of pre-existing or background IP is limited by statute.

The complement matters just as much: **what the document says is not
jurisdiction-dependent.** Property extraction, citation, the summary and counter-offer
drafting are the same in every jurisdiction. Jurisdiction changes the legal-effect
commentary, not the reading of the text.

**What the Signer sees.** The assumed jurisdiction is declared in the masthead alongside
the document's other state, in one of three forms — detected, with the clause it came
from; set by the Signer; or not determined — and is correctable from there. `DESIGN.md`
already gives the masthead the job of declaring the document and its state, so this uses
it rather than introducing a new component.

## Alternatives
- **Ask the Signer, and only ask.** Unambiguous, and the Signer is the authority on
  their own situation. Rejected as the sole mechanism because it puts a legal question
  in front of someone before they have seen any output, when the answer is usually
  written in the contract they just uploaded.
- **Detect, and only detect.** Zero friction and fully sourced, but it is wrong exactly
  when a contract omits a governing-law clause, which is common, and it gives the Signer
  no way to correct a detection they know is wrong.
- **Default to US law when nothing is found, and say so quietly.** The path of least
  resistance, and the one ADR 0005 exists to rule out — a stated assumption a Signer does
  not read is indistinguishable from an unstated one.
- **Refuse to analyse until jurisdiction is known.** Safest on legal claims, useless as a
  product. Most of the analysis does not depend on jurisdiction at all, so withholding
  all of it to protect the part that does trades everything for very little.
- **Flag a detected-versus-chosen mismatch as a finding.** Considered and rejected: it is
  not a risk in the document's wording, and putting it in the ranked list would compete
  with findings that are.

## Why
The governing-law clause is text, which means detection can be sourced and checked the
same way every other claim in this product is — the Signer can see the sentence the
jurisdiction came from. That makes detection the right default rather than a guess. But
the document is not the final authority: it can omit the clause entirely, or name a
forum whose relevance the Signer understands better than the analysis does, so an
override has to be free rather than buried. And the `undetermined` case has to be a real
state that the analysis handles, not an absent value that quietly becomes US, because the
whole point of ADR 0005 was that an unstated legal assumption is the failure.

## Consequences
- `analyze()` takes jurisdiction as an explicit argument with a genuine `undetermined`
  case, not a string that defaults.
- Detection returns both a jurisdiction and the source sentence it came from, or nothing.
  A jurisdiction without its sentence is not a detection.
- The stored analysis must record which jurisdiction it assumed, or a returning Signer
  cannot tell what they were told.
- Ticket 14, which surfaces jurisdiction in the product, is unblocked by this decision.
- The set of jurisdiction-dependent claims above is now a list the analysis has to
  respect, and adding a legal claim means deciding which side of it the claim falls on.
