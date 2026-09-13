---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Landing page

**Scope.** One public page. Persuade. No auth, no upload, no model call, no document
handling (`docs/spec-v1.md`).

**Audience.** A Signer: a freelancer holding a contract a client drafted, deciding
whether to sign. They have Leverage — they can email back and ask for a change. That is
confirmed against `PRD.md` §1 and ADR 0002 after the original brief described them as
unable to negotiate.

**Job.** Decide whether to trust this with a confidential client contract, before
uploading one.

**Action.** One: run your own contract. Links to sign-in, which does not exist yet
(tickets 04, 05). A knowingly dead end, confirmed with the user.

**Proof.** A contract turning into ranked flags, each showing the exact sentence it came
from. Demonstration material is authored at full fidelity from a sample freelance
contract and labelled as a sample; ticket 18 replaces it with real analysis output once
the analysis exists.

**Claim before proof.** The page states what the Signer gets before it shows the worked
contract. Three plain statements under a "What you get" label — ranked flags that quote
their source sentence, a counter-offer drafted per flag, questions answered from the
document — sit between the head and the galley, drawn from PRODUCT.md capabilities 3, 5
and 6. They are set as bare statement-and-note rows on the established cleared-list
treatment: no icons, no cards, no second visual system. This was added in the revision
round of 2026-09-13, after the user found the page went from headline straight into a
dense four-clause annotated contract, which asks a first-time reader to parse the
demonstration before they know why it matters.

**Constraints.** No verdict on whether to sign, no legal advice, no scanned or
photographed documents, no document type outside freelance and contractor agreements.
Real product name. No invented prices, customers, quotes, benchmarks or accuracy
figures — none exist (`PRODUCT.md`, Evidence on Hand). WCAG 2.2 AA; severity never
carried by color alone; the path from a flag to its sentence reachable by keyboard.
Copy runs through the humanizer skill before commit (`CLAUDE.md`).

**Memorable moment.** Selecting a marginal mark draws its leader rule to the exact
sentence and dims every other line of the contract. The link becomes physical.

**Brand placement.** No wordmark above the sheet. The name appears twice, in the galley
foot's legend row and as an italic Tinos signature in the field footer, where it plays
as a printer's mark. Confirmed with the user on 2026-09-13 when they asked whether a
logo was missing: The Full-Bleed Sheet Rule holds, and no logo asset exists to place
(`PRODUCT.md`, Brand Commitments).

**Unresolved.** The page has no conversion goal beyond the dead-end action. Jurisdiction
is unaddressed here. How the page sets expectations about deliberate over-flagging
(ADR 0004) is undecided.

**Never verified at narrow width.** Chrome in the build environment refused every window
resize, and refused again in the 2026-09-13 revision round: the resize call reported
success while the viewport stayed at 1536px. No capture at a real 390px viewport exists.
The narrow-width evidence is a simulation whose headline renders around 56px because
`4.6vw` kept evaluating at 1536; a real 390px viewport hits the `2.05rem` clamp floor
near 33px. The head's column collapse, the masthead's stacked legend, the galley foot's
three-part row, the marked-sentence reflow and the "What you get" row's collapse from
three columns to one are all unverified there. Recorded deliberately rather than chased.
Anyone picking this up should check it on a real device before trusting the mobile
layout.

**Known type drift.** Four literal font sizes on this page sit off the DESIGN.md ramp
(0.78rem, 0.86rem and 0.88rem twice). Three predate the revision round; the fourth is
the "What you get" note, set to match the adjacent cleared-list note rather than the
documented 0.94rem body-small step. Advisory only. Either the page moves onto the ramp
or DESIGN.md records these steps, but that is a design-system decision and not a
side effect of a copy change.

**Finish.** Three review rounds, ending in a ship verdict scoped to desktop width only.
Eight material fixes and three self-inflicted regressions were scored resolved; the
narrow viewport was never part of that verdict. A later revision round on 2026-09-13
rewrote the hero copy, added the claim-before-proof block, and re-verified the page at
desktop width with the mechanical detector and a typecheck.

## Direction contract

**THESIS.** Proof correction notation applied to a contract someone else wrote: every
flag is a marginal mark tied by a caret to the exact sentence it answers, because that
notation is already the act this product performs. It refuses the legal-tech
arrangement — confident hero above a floating browser frame holding a blurred document
with colored highlight chips.

**OWN-WORLD.** A deep marking-blue field carries the page; the contract sits on it as a
cool proof stock column with wide, functional margins. Every mark, leader rule and flag
is corrector's vermilion. Contract text is set in Tinos, the face contracts are actually
set in; the product's own voice is Archivo, tracked, in the register of a production
legend. Proof marks — caret, dele, stet, transpose — are authored SVG glyphs at icon
scale in one stroke weight. No cards anywhere.

**STORY.** The Signer learns what Redline gives them before they are asked to read
anything; understands that a flag here is a pointer, not an opinion; believes the
analysis is checkable because they watch a mark tie itself to a sentence in front of
them; and goes to run their own contract.

**FIRST VIEWPORT.** One proof galley, full bleed, no page chrome above it. The argument
is set as the galley's own head at display scale with nothing above it, the primary
action at its foot as a stamped block. Beside the head, the findings ranked worst-first
as a compact index — this is the product's ranked flags. Then the three statements of
what the Signer gets, hairline-ruled, which carry the claim the galley then proves. Then
the galley itself: left, the contract on proof stock at reading measure, one clause
visibly struck and marked; right, the margin carrying each vermilion mark at its own
line's height, in document order, because a proof mark ties to position and not to rank.
The highest-severity mark opens as a finding naming what the clause would cost, and a
vermilion leader rule runs from it across the gutter to the exact sentence.

**FORM.** Proofreader's marks — candidate 1 of 7 on the grounded list, taken as
IMPECCABLE'S PICK over the roll's assignment (Result Sheet, candidate 5). Seed key
0b769778.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
