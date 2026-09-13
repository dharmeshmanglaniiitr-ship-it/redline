---
name: Redline
description: Proof-correction notation applied to a contract someone else wrote.
colors:
  field: "#16307f"
  field-deep: "#0f2159"
  field-ink: "#e9eae3"
  field-soft: "#a9b6dc"
  stock: "#e9eae3"
  stock-shade: "#dcded2"
  rule: "#b7b9ac"
  ink: "#14140f"
  ink-soft: "#55554c"
  mark: "#c8341f"
  mark-deep: "#9d2614"
  pencil: "#2b4c8c"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.05rem, 4.6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3.4vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  document:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  document-title:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "tabular-nums lining-nums"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.2em"
  legend:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.2em"
    fontFeature: "tabular-nums lining-nums"
  stamp:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  none: "0px"
  hairline: "1px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2.25rem"
  xl: "3.5rem"
  xxl: "5rem"
  gutter-page: "1.25rem"
  gutter-page-wide: "4rem"
components:
  stamp-galley:
    backgroundColor: "{colors.mark-deep}"
    textColor: "{colors.stock}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.75rem"
  stamp-galley-hover:
    backgroundColor: "transparent"
    textColor: "{colors.mark-deep}"
  stamp-field:
    backgroundColor: "{colors.mark-deep}"
    textColor: "{colors.stock}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0.875rem 1.75rem"
  stamp-field-hover:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.mark-deep}"
  index-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0"
  index-row-hover:
    backgroundColor: "{colors.stock-shade}"
  index-row-active:
    textColor: "{colors.ink}"
  margin-mark:
    backgroundColor: "transparent"
    textColor: "{colors.mark}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0"
  margin-mark-hover:
    backgroundColor: "{colors.stock-shade}"
  galley-sheet:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2.5rem 1.25rem"
  cleared-row:
    backgroundColor: "transparent"
    textColor: "{colors.pencil}"
    typography: "{typography.body-small}"
    rounded: "{rounded.none}"
    padding: "0.875rem 0"
---

# Design System: Redline

## Overview

**Creative North Star: "The Marked Proof"**

Redline is a proof galley on a corrector's desk. A deep marking-blue field carries the
page; the document sits on it as a cool proof-stock sheet with real trim corners and
wide, functional margins. Every correction is made in corrector's vermilion, and every
correction is made twice — once in the line and once in the margin — because that is
what proof notation is and because it is also literally what the product does: point at
a sentence.

The system is dense, flat and typographic. There are no cards, no panels, no floating
browser frames, no shadows and no rounded corners; separation is done with hairline
rules, weight-2 rules at masthead and foot, and the hard edge between blue field and
proof stock. Density is high on purpose: a Signer reading a contract is reading, not
scanning, so the measure is held at 58–68ch and the type ramp is small-stepped rather
than dramatic. The one display moment is the galley's own head, which sits at the top of
the sheet with no chrome above it.

Two voices carry all text. Contract language is set in Tinos, a Times-metric face, so
the quotation looks like the thing being quoted; the product's own voice is Archivo,
tracked and uppercase at label scale in the register of a printer's production legend.
Neither is a system face. Confirmed rejection: the legal-tech arrangement of a confident
hero above a floating browser frame holding a blurred document with colored highlight
chips.

**Key Characteristics:**
- Paired marks: every finding appears in the line and in the margin, never one alone.
- Vermilion is the only correcting hand; blue pencil marks only what was cleared.
- Flat, hairline-ruled, zero-radius, zero-shadow.
- Two type voices: Tinos for the document, Archivo for the product.
- Exactly one authored motion: the leader rule drawing itself.

## Colors

A two-world palette: a saturated marking blue for the product's own field, cool proof
stock for the document, and a single correcting vermilion that appears on both.

### Primary
- **Corrector's Vermilion** (`{colors.mark}`): every proof mark, caret, leader rule,
  underline and strike. It is the correcting hand and nothing else uses it.
- **Stamped Vermilion** (`{colors.mark-deep}`): the deepened stamp fill and severity
  wordmark. Used where vermilion must carry text, because it clears AA against proof
  stock (6.38:1 for stock on stamped vermilion) where the lighter mark does not.

### Secondary
- **Marking Blue** (`{colors.field}`): the desk. Carries `html`, `body` and every
  section below the galley.
- **Deep Marking Blue** (`{colors.field-deep}`): scrollbar track only; the field's own
  shadow value.

### Tertiary
- **Blue Pencil** (`{colors.pencil}`): the second marking hand — the "Checked, nothing
  to report" heading and its check glyphs. It signals absence of a finding and must
  never be used for a finding.

### Neutral
- **Proof Stock** (`{colors.stock}` / `{colors.field-ink}`): the sheet, and the same
  value doing duty as body text on the blue field. One neutral, two jobs.
- **Stock Shade** (`{colors.stock-shade}`): hover fill on index rows and margin marks,
  and the held highlight behind the selected sentence.
- **Rule Grey** (`{colors.rule}`): hairline rules, trim corners, the margin's left rule.
- **Document Ink** (`{colors.ink}`): the contract's text and the display head.
- **Soft Ink** (`{colors.ink-soft}`): supporting prose, inactive index titles, the
  galley foot.
- **Field Soft Blue** (`{colors.field-soft}`): supporting prose on the field; at 30%
  alpha it is the field's only divider.

### Named Rules
**The One Correcting Hand Rule.** Vermilion means a correction. Blue pencil means
checked and cleared. No third marking colour is added, and neither hand borrows the
other's job.

**The Never-By-Colour Rule.** Severity is encoded three ways simultaneously — filled
steps out of four, a severity word, and an `sr-only` "severity, N of 4". This is a
WCAG 2.2 AA obligation from PRODUCT.md, not a style. A severity display that survives
grayscale printing and screen-reader-only consumption is the minimum; colour is the
fourth, redundant channel.

**The Keyline Rule.** The stamp's vermilion fill is only 1.55:1 against marking blue, so
on the field the stamp carries a 3px proof-stock keyline that does the separating. On
proof stock the same block takes a 3px stamped-vermilion keyline instead. Both hovers
invert fill and text without dropping below AA. Never ship the stamp on the field
without its keyline.

## Typography

**Display Font:** Archivo (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Archivo
**Document Font:** Tinos (with Times New Roman, Times, serif) — italic and 700 loaded

**Character:** Archivo is grotesque, tight-tracked at display size and wide-tracked at
label size; it reads as production apparatus — mastheads, legends, sheet numbers. Tinos
is Times-metric, which is the face freelance and contractor agreements are actually set
in, so quoted clause text looks like the document it was taken from rather than like
product UI. Both are webfonts loaded through `next/font`; `font-synthesis-weight` is
off, so a weight that was not loaded is never faked.

### Hierarchy
- **Display** (`{typography.display}`): the galley's own head, once per page, capped at
  18ch so it breaks into a stack of short lines.
- **Headline** (`{typography.headline}`): field-side section heads and the closing
  statement, capped at 38ch.
- **Title** (`{typography.title}`): finding titles in the margin and, one step down
  (0.92rem), in the ranked index.
- **Body** (`{typography.body}`): the product's own prose, 58ch measure.
- **Body Small** (`{typography.body-small}`): the cost explanation under an opened
  margin mark (40ch) and cleared-item notes.
- **Document** (`{typography.document}`): contract clause text, 58ch measure — the only
  place Tinos runs at reading length.
- **Document Title** (`{typography.document-title}`): clause number and heading; also
  the "Clause 4.2" reference in the index, where the serif is the cue that the string
  belongs to the document and not to Redline.
- **Label** (`{typography.label}`): uppercase section labels, 0.2em tracked.
- **Legend** (`{typography.legend}`): masthead and galley foot; tabular figures.
- **Stamp** (`{typography.stamp}`): the primary action's block label, 0.18em tracked.

### Named Rules
**The Two Voices Rule.** Tinos speaks only for the document — clause text, clause
numbers and headings, clause references, and the Redline signature in the field footer
where it plays as a printer's mark. Archivo speaks only for the product. A line of
product copy set in Tinos, or a quoted clause set in Archivo, is a bug.

**The Tabular Figures Rule.** Any string whose job is a number a reader might compare —
clause numbers, sheet numbers, index ranks, masthead legends — carries
`font-variant-numeric: tabular-nums lining-nums` via the `.numeric` class.

## Layout

One centred measure at `max-width: 84rem` with page gutters stepping 1.25rem → 2rem
(640px) → 4rem (1280px). Inside it the sheet runs full-bleed to the viewport edge; the
blue field below it shares the same container.

The signature structure is the **galley**: a two-column split at 1024px and above,
document left at reading measure and margin right at a fixed 18rem, joined by a
`gap-x: 2.5rem` gutter and a hairline left rule on the margin column. The head uses the
same logic with a 24rem index column and a 4rem gutter. Below 1024px both collapse to a
single stacked column — the margin falls under its clause, losing its left rule.

Vertical rhythm is coarse and consistent: 3.5rem between major galley regions, 4rem
before the galley foot, 5rem between field sections, 2.25rem between clauses. Within a
block the steps are 0.75 / 1.25 / 1.75 / 2.25rem. Measures are pinned per role rather
than globally: 18ch display, 38ch closing statement, 40ch cost note, 58ch prose and
clause text, 68ch masthead note. A `--measure: 66ch` token exists in `:root` as the
declared house measure.

### Named Rules
**The Desktop Leader Rule.** The vermilion leader rule that draws from a margin mark
across the gutter to its sentence is rendered only at `min-width: 1024px`, and the
measurement function returns null below that. This is deliberate, not a gap: below
1024px the two columns are stacked, so there is no gutter for a leader to cross and any
drawn path would run over body text. Below 1024px the in-line mark carries the tie, and
the mark plus the margin card are adjacent. Do not "fix" the leader's absence on narrow
screens by drawing one anyway.

**The Full-Bleed Sheet Rule.** The proof stock runs edge to edge with no chrome above
it. No navigation bar, no logo lockup, no browser frame. The first thing on the page is
the sheet and its head.

## Elevation & Depth

There are no shadows anywhere in this system, and none should be added. Depth is done
three ways: the hard material change between marking blue and proof stock; hairline
rules at `{colors.rule}` for lists and column separation, stepping to 2px at
`{colors.ink}` for the masthead and galley foot where the sheet's own structure is being
declared; and opacity, where unselected clauses sit at 0.82 and the selected clause at
1.0 so attention is a lighting change rather than a lift.

**The Dim Floor Rule.** 0.82 is the floor, not a taste setting, and nothing dimmed may
go below it. Dimming blends text toward the stock behind it, and the severity word is
the tightest thing on the sheet: `{colors.mark-deep}` on proof stock is 6.37:1 at full
opacity, 4.03:1 at 0.75, and clears the 4.5:1 that WCAG 2.2 AA asks of 11.2px text only
at 0.81 and above. The value was 0.75 until an axe-core audit on 2026-09-13 caught the
severity word failing in every unselected clause, which is three of the four findings at
any moment. Severity is encoded three ways, so no information was lost, but the text
still has to be readable. Dim further and it stops being.

**Motion.** Exactly one authored moment exists: the leader rule draws itself from the
margin mark to the sentence over 620ms on `cubic-bezier(0.16, 1, 0.3, 1)`, implemented
as a `stroke-dashoffset` animation on a `pathLength={1}` polyline, re-keyed on selection
so every new selection redraws. Everything else is a 200ms colour transition (hover,
focus) or a 500ms opacity transition (clause dimming). A global
`prefers-reduced-motion: reduce` block collapses all animation and transition durations
to 0.01ms.

### Named Rules
**The One Moment Rule.** The leader rule is the only thing on this surface that
animates for its own sake. A new surface gets state transitions and nothing else; if it
needs a second authored moment, that is a system change, not a local decision.

**The Flat Rule.** No `box-shadow`, no elevation, no blur, no glass. If two things need
separating, use a rule, a material change, or opacity.

## Shapes

Zero radius everywhere. The only curved value in the build is the 1px softening on the
focus ring, which exists so the outline does not read as a box. Buttons, stamps, index
rows, margin blocks and the sheet itself are all square.

The form language is the printed sheet: trim corners (four 20px L-brackets in rule grey,
inset 12px) mark the stock's edges so it reads as a sheet rather than a page background;
1px hairlines separate list rows; 2px ink rules open the masthead and close the galley
foot; 3px keylines define the stamp.

Icons are authored SVG at 24px viewBox, single 2px stroke weight, round cap and join,
`currentColor`, `aria-hidden`. Three proof marks exist — caret (insert), strike (delete)
and query — plus a check for cleared items. In-line they scale to `0.95em` and shift up
0.1em to sit on the text baseline.

### Named Rules
**The No Cards Rule.** Nothing on this surface is a card. No container gets a
background fill, a border on all four sides, and padding at the same time. Groupings are
made by rules, measure and whitespace.

## Components

### Buttons (the Stamp)
- **Character:** an inked rubber stamp, not a button. Square, tracked, uppercase, heavy.
- **Shape:** no radius (0px), 3px keyline.
- **Primary on proof stock:** stamped-vermilion fill, proof-stock label, stamped
  vermilion keyline, `{components.stamp-galley.padding}`.
- **Primary on the blue field:** same fill and label, but a proof-stock keyline, because
  the fill alone is 1.55:1 against the field.
- **Hover / Focus:** 200ms colour transition to an inversion — on stock the fill drops
  to transparent and the label becomes stamped vermilion; on the field the fill becomes
  proof stock and the label stamped vermilion. `:focus-visible` produces the same
  inversion as hover, in addition to the global focus ring.
- There is no secondary or ghost button in the build. The page has one action, offered
  twice.

### Ranked index (navigation)
- **Style:** an ordered list inside a labelled `nav`, hairline-ruled top and between
  rows, no fill at rest.
- **Rows:** tabular rank numeral, title, then severity meter and a Tinos clause
  reference on a second line.
- **States:** hover fills stock-shade; the active row takes document ink plus a 2px
  vermilion underline at 4px offset and its rank numeral turns stamped vermilion;
  selection state is carried in `aria-pressed`.
- **Mobile:** stacks above the galley as a full-width block; no other change.

### Severity meter
Four 5×12px cells with 1px vermilion borders, filled in vermilion up to the finding's
step, followed by the severity word in 0.7rem uppercase stamped vermilion at 0.16em
tracking, followed by a visually hidden "severity, N of 4". All three channels ship
together. Removing any one of them breaks a WCAG 2.2 AA commitment.

### Margin mark (signature component)
The margin half of the pair: a proof-mark glyph at 24px in vermilion, the finding title
in document ink, and the severity meter. It is a `button` carrying `aria-pressed` and
`aria-controls` pointing at the sentence's id, with a visually hidden "Show the sentence
in clause N this came from". Selecting it opens the cost explanation beneath at 40ch,
raises its clause from 0.82 to full opacity, and — at 1024px and above — draws the
leader rule. At 1024px and above the margin column carries a hairline left rule and
2rem of left padding.

### Marked sentence (signature component)
The in-line half of the pair: the same proof-mark glyph at `0.95em` immediately before
the sentence, plus a vermilion 1.5px decoration on the sentence itself —
`line-through` when the finding's mark is a strike, solid `underline` when selected,
dotted `underline` when not — at 5px underline offset. Selected sentences also take a
stock-shade fill.

**The Paired Mark Rule.** A finding is a mark in the line *and* a mark in the margin,
carrying the same glyph, read together. One without the other is not a lighter version
of this system; it is a broken one. Any future surface that shows findings must ship
both halves, whatever the viewport.

### Masthead and galley foot
Two horizontal legend rows in 0.68–0.72rem uppercase Archivo at 0.2em tracking with
tabular figures: the masthead (`border-bottom: 2px` document ink) declares the document
and its state; the foot (`border-top: 2px`) carries the wordmark, the reading
instruction, and the sheet number. Both wrap with `flex-wrap` and their parts spread
with `justify-between`.

### Cleared list
Two-column list at 640px and above, hairline-ruled, each row led by a 20px blue-pencil
check. Blue pencil appears here and in the section heading only.

### Browser surfaces
These are themed deliberately and are part of the system, not defaults: scrollbar
(`scrollbar-color: vermilion on deep marking blue`, `color-scheme: dark`);
`::selection` set to vermilion fill with proof-stock text, declared globally and again
scoped to `.galley` so the sheet keeps the same red-pencil-on-stock selection regardless
of the cascade; `:focus-visible` as a 2px vermilion outline at 3px offset with 1px
radius; links at `text-underline-offset: 0.2em` with `text-decoration-thickness:
from-font`.

## Do's and Don'ts

### Do:
- **Do** ship both halves of every mark — in-line glyph and margin mark, same glyph, per
  The Paired Mark Rule.
- **Do** encode severity three ways at once: filled steps out of four, the severity
  word, and an `sr-only` "severity, N of 4".
- **Do** give the stamp its 3px keyline — proof stock on the blue field, stamped
  vermilion on proof stock — and keep both hover inversions at or above AA.
- **Do** set anything quoted from a document in Tinos, and anything Redline says in
  Archivo.
- **Do** separate with hairline rules, 2px ink rules, material change or opacity.
- **Do** apply `.numeric` to clause numbers, ranks, sheet numbers and legends.
- **Do** keep authored SVG proof marks at a single 2px stroke weight, `currentColor`,
  `aria-hidden`.

### Don't:
- **Don't** add a `box-shadow`, a radius above 1px, or a card. This system is flat and
  square.
- **Don't** let colour be the only carrier of severity, selection or state.
- **Don't** use vermilion for anything that is not a correction, or blue pencil for
  anything that is not a cleared item.
- **Don't** draw a leader rule below 1024px; the stacked layout has no gutter to cross
  and the in-line mark already carries the tie.
- **Don't** add a second authored animation. One moment, 620ms, exponential ease-out,
  with `prefers-reduced-motion` honoured.
- **Don't** put chrome above the sheet — no nav bar, no logo lockup, no browser frame.
- **Don't** rely on `font-synthesis` for a weight that was not loaded; load it or don't
  use it.

<!--
KNOWN GAP — narrow-viewport evidence (recorded, not an action item).

No capture at a real 390px viewport was ever obtained; Chrome in this environment
refused every window resize. The narrow-width evidence on file is a simulation that
renders the h1 at roughly 56px, because 4.6vw kept evaluating against 1536px. A real
390px viewport hits the clamp floor instead, at about 33px. Consequently the following
are UNVERIFIED at narrow widths: the head's two-column collapse, the masthead's stacked
legend, the galley foot's three-part row, and the marked-sentence reflow. The user
decided to record this rather than chase it. Do not assume mobile was checked.
-->
