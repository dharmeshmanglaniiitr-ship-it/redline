---
version: 1
slug: "app-app-layout-tsx"
primary_target: "app/(app)/layout.tsx"
related_targets: []
---

# App shell

**Status: brief only. No screen built.** Written alongside the landing page so one world
covers both surfaces; implementation waits on tickets 04, 05, 07 and 08.

**Scope.** The frame behind sign-in that holds every working view: bringing a document
in, the result, the question box, the Signer's red lines, and the library. Operate.

**Audience.** The same Signer, now signed in, with a contract they need to answer today.

**Task.** Get a document in, read what it found worst-first, check any flag against the
contract's own words, ask the thing the flags did not cover, and leave with language to
send back.

**States that must be designed, not discovered.** Empty library on first sign-in. A
document still being analysed. A document that cannot be read at all, which must never
resemble a clean result — the most dangerous failure this product has
(`docs/spec-v1.md`). A genuinely clean contract, which has to read as a real finding
rather than an absence. A jurisdiction the analysis had to assume. A question the
document does not answer.

**Constraints.** Text is parsed in the browser and only extracted text is stored. A
Signer sees only their own documents. Severity never carried by color alone. WCAG 2.2
AA. Copy runs through the humanizer skill before commit.

**How the world carries over.** The landing page's proof galley is not a marketing
device — it is the working view. The contract stays on proof stock in a reading column;
findings live in the margin in severity order; selecting one draws its leader rule to
the sentence and dims the rest. Four mappings follow from the notation rather than being
invented for it:

- **Red lines are the correction standard.** A proof is marked against a house style.
  The Signer's own red lines are that standard, edited as a standing document rather
  than a settings form, which is why re-ranking on edit is native to the metaphor.
- **The question box is a query to the margin.** An author's query on a proof is written
  in the margin and answered there. An unanswerable question returns as a query marked
  unresolved, not as a blank.
- **The library is a stack of marked proofs**, each carrying the date it was marked and
  what standard it was marked against. A kept proof opens on the marks it was filed with;
  asking for it to be read again produces a second proof, dated today, that does not
  replace the one on file (`docs/adr/0010`).
- **The clean verdict is the collation mark.** A proof signed off names what was
  checked. Nothing here invents a green tick.

**Unresolved.** How jurisdiction is asked for or detected (ticket 03). How
deliberate over-flagging is set up so a Signer does not read false positives as
inaccuracy. Whether bringing a document in is paste, file, or both as equals.

## Direction contract

Inherited from the landing page's contract, seed key 0b769778 — Proofreader's marks,
candidate 1 of 7, taken as IMPECCABLE'S PICK over the roll's assignment. The world is
fixed by that build; this surface resolves composition and state inside it and does not
reopen identity. Its own FIRST VIEWPORT and signature interaction are decided when the
surface is built, against the system DESIGN.md records from the landing page.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
