# 3. Severity comes from clause specificity, not clause category

## Decision
Redline does not score a clause's severity from a fixed per-category table (e.g. "IP
assignment = medium, non-compete = high"). Within a clause type, severity is driven by
specific, checkable properties of the clause's actual wording: how far an IP
assignment reaches beyond the deliverable, whether a payment-approval standard is
objective or left undefined, how long/broad/uncompensated a non-compete restriction
is. The same clause type can range from unflagged to high-severity depending on what
it actually says.

## Alternatives
- A static per-category severity table. Simpler to build and explain, but flags
  standard boilerplate as dangerous just as often as it misses genuinely dangerous
  instances that don't fit the stereotype for their category.
- Flag every instance of a "risky-sounding" clause type at maximum severity.
  Maximizes recall, but guarantees the product cries wolf on completely standard
  language — the exact failure mode that makes a risk tool stop being believed.

## Why
This pattern emerged independently across three unrelated clause types in the same
interview: dangerous IP assignment isn't "any IP assignment," it's assignment that
reaches beyond the deliverable. Dangerous payment terms aren't "any termination
clause," they're undefined/subjective approval criteria. Dangerous non-competes
aren't "any restriction," they're long, broad, or uncompensated ones. The same test —
does the specific language cross a defined threshold — held three times, which is
exactly the bar for writing a decision down before someone builds a shortcut
category-lookup instead.

## Consequences
- Severity scoring needs sentence-level reasoning about a clause's actual scope, not a
  clause-type classifier — a harder prompting/generation problem than "detect category
  X, assign severity Y."
- Each clause type needs its severity thresholds made explicit as it's defined (as
  round two of this interview did for IP assignment, payment/termination, and
  non-competes) — future clause types should be specified the same way, not added as
  category-lookup entries.
- Testing has to cover edge cases within a clause type (a narrow IP clause vs. a broad
  one), not just whether each clause type is detected at all.
