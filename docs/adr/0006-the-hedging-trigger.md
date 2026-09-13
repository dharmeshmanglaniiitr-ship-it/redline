# 6. Redline hedges when a severity-determining property is absent from the text

## Decision
ADR 0004 commits Redline to hedging "only when its confidence in the interpretation is
genuinely low" without saying what that means. This defines it structurally rather than
by feel, using machinery ADR 0003 already requires:

> Redline hedges a finding **if and only if** at least one property that its severity
> function consumed was **not stated in the document**. If every severity-determining
> property was found in the text, the finding is stated plainly.

The severity-determining properties are enumerated per clause type and are already a
required part of the analysis:

- Non-compete / non-solicit: duration, geographic scope, industry scope, whether the
  restriction is separately compensated.
- IP assignment: whether the assignment reaches beyond the engagement's deliverable.
- Payment approval: whether the acceptance standard is objective or left to the
  Sender's judgment.
- Termination for convenience: whether a kill fee exists.

For any finding, each of those properties is either extracted-from-text or unstated, so
the invariant `hedged === (unstatedProperties.length > 0)` is mechanically testable.
Nobody judges by feel, and no appeal is made to the model's self-reported confidence.

Three bounds stop hedging becoming the default:

1. **A hedge must name the missing property.** "This assumes the restriction is
   uncompensated, which the contract does not address" is a hedge. "This may or may not
   be a problem" is not a hedge, it is a failure — if the analysis cannot name what is
   missing, the finding is stated plainly or not made at all.
2. **A hedge never lowers severity and never suppresses a flag.** ADR 0004 commits to
   over-flagging. Hedging is a statement about the *basis* of a finding, not a softening
   of the finding. Severity is still derived from the properties that *were* stated,
   with the unstated property assumed at its dangerous end.
3. **A hedge is per-finding, never per-document.** There is no global "this analysis is
   uncertain" banner; that is the safe-and-useless drift ADR 0004 named as its own risk.

**A hedge is not a jurisdiction qualifier.** These are two different things and must not
be conflated. A jurisdiction-dependent legal claim — is this non-compete enforceable? —
is *always* stated relative to the governing jurisdiction regardless of confidence. That
is attribution, and ADR 0005 and ADR 0007 govern it. A hedge is about a property the
document is silent on: a fact about the text, not about the law. A finding can be both,
stated relative to jurisdiction *and* hedged on a missing property. They compose;
neither substitutes for the other.

**Silence about a clause and silence about a property are different cases.** ADR 0001
already says silence is not citable, so a risk inferred only from a *missing clause*
produces no flag at all. This decision covers the other case, where the clause is
present and cited but one of its properties is unstated. Silence about a whole clause →
no flag. Silence about a property of a cited clause → flag, hedged, property named.

Worked examples on both sides of the line:

- *Stated plainly.* "Payment shall be due upon Client's acceptance, in Client's sole
  satisfaction." The acceptance-standard property is present and resolves to subjective.
  Nothing is missing, so the highest-severity finding is stated flatly, with no hedge.
- *Stated plainly.* "Contractor assigns to Client all work product created under this
  Agreement." The reach-beyond-deliverable property is present and resolves to bounded.
  Flagged low or not at all, stated plainly — flagging this high is the crying-wolf
  failure ADR 0003 exists to prevent.
- *Hedged.* A twelve-month, industry-wide non-compete where the contract says nothing
  about whether the restriction is compensated. Duration and scope are stated;
  compensation is not. The finding is made at the severity the stated properties
  support, and it names the gap: the contract does not say whether the restriction is
  separately compensated.
- *Hedged.* "Contractor assigns all Work Product to Client", where "Work Product" is
  used as a defined term the contract never defines. Whether the assignment reaches
  beyond the deliverable cannot be resolved from the text, so the finding names that the
  term is undefined.

## Alternatives
- Trigger hedging on the model's own reported confidence score. The obvious reading of
  ADR 0004's wording, and the cheapest to implement. Rejected because a self-reported
  number is not checkable against the document — a reader looking at a finding could not
  say whether hedging was correct there, which is the whole thing this decision had to
  produce.
- Leave it to judgment, with written guidance about tone. Keeps the flexibility to hedge
  where a rule would not, but every borderline case resolves toward hedging because
  hedging is always the safer-feeling choice. That is the drift ADR 0004 predicted.
- Hedge by lowering severity instead of by saying what is missing. Reads as more
  cautious, but it buries the finding in exactly the case where the contract is
  ambiguous enough to be dangerous, and contradicts ADR 0004's preference for false
  positives over false negatives.
- A single document-level uncertainty notice instead of per-finding hedges. Simpler to
  display and honest in aggregate, but it tells the Signer nothing about which finding to
  distrust, and applies the caveat to the plainly-stated findings as well.

## Why
Hedging had to be defined in terms of something already extracted, or it would be a new
judgment call layered on top of the analysis. ADR 0003 had already forced severity to
come from named properties rather than clause categories, which means the analysis
always knows which properties it consumed — and therefore which ones the document never
supplied. Hedging on exactly that set costs no new machinery, produces a hedge that
names something concrete, and gives the test suite a boolean it can assert. It also puts
the trigger where the Signer can check it: the contract either says how long the
restriction lasts or it does not.

## Consequences
- The analysis must return per-property provenance — stated or unstated, per property —
  not just a severity number. Severity alone cannot tell a caller whether to hedge.
- The test suite gains a mechanical invariant: a finding is hedged exactly when its
  property set has an unstated member, and every hedge names that member.
- A clause type cannot be added without enumerating its severity-determining properties.
  This is the same constraint ADR 0003 already imposes, now load-bearing twice.
- Hedged findings sit at the same severity as unhedged ones, so the UI needs to
  distinguish them by what they say rather than by rank — a hedge is text naming a gap,
  not a lower position in the list.
