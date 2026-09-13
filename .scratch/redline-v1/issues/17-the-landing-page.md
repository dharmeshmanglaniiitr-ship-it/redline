# 17: The landing page

**What to build:** The page a Signer sees before they have decided to trust Redline with
anything. It explains what the product does, what happens to a file they upload, and what
Redline is not.

This is the only surface that exists before the decision that matters. Redline's opening
request is that someone hand over a confidential client contract, and the strongest fact
the product has — the file is parsed in their own browser and never stored — is currently
invisible until after they have already taken the risk. The page exists to move that fact
in front of the decision rather than behind it.

The page is public and static. No authentication, no upload, no model call, no document
handling of any kind. It cannot help a Signer decide whether to trust the product with a
contract while already asking for one.

**Two constraints carry more weight here than anywhere else in the product.**

Every factual claim traces to `PRODUCT.md`'s Evidence on Hand, which records both what is
sourced and what must not be fabricated. There are no customers, no testimonials, no
benchmarks, no accuracy figures and no pricing — inventing any of them would be the same
defect as a flag without a source sentence, committed in the first thing a visitor reads.

And if the page demonstrates what a flag with its source sentence looks like, that output
is either produced by the real analysis or plainly labelled as an illustration. Ticket 18
replaces the illustration with real output once the analysis exists. Note what DoNotPay
was actually sanctioned for: the marketing, not the code. That makes this page the
highest-risk surface in v1 for the one failure the product is most exposed to.

Stories 32–36.

**Blocked by:** 01

**Status:** done — built, reviewed, revised and deployed as of 2026-09-13. **Do not
rebuild this page and do not start an impeccable direction round on it.** The page lives
at `app/page.tsx`; its direction contract and everything recorded about it live in
`.impeccable/surfaces/app-page-tsx.md`, and the visual system it obeys is `DESIGN.md`.
Ticket 18 is the one that touches this page again, replacing the illustrated analysis
with real output once the analysis exists.

One criterion is open and cannot be closed from this machine: the phone check. Chrome in
this environment refuses every window resize, reporting success while the viewport stays
at 1536px. It was attempted again during the 2026-09-13 revision and failed the same way.
Closing it needs the deployed URL opened on a real device, which is a person's job, not
an agent's. Do not attempt to satisfy it by editing the page blind.

- [x] A Signer can understand what Redline does without uploading anything — the hero
      states the value plainly and three statements name what they get, before the
      worked example
- [x] The page states plainly that files are parsed in the browser and never stored, and
      places that where it informs the upload decision rather than after it
- [x] The page shows what a flag and its source sentence look like; any depicted output
      is real or unambiguously labelled as an illustration — labelled in place as a
      sample written for the page
- [x] The page makes clear that Redline explains a document and drafts language, and does
      not advise whether to sign or replace a lawyer
- [x] Every factual claim traces to `PRODUCT.md`'s Evidence on Hand — no invented
      customers, testimonials, benchmarks, usage figures, accuracy claims or pricing
- [x] The page is public and static: no auth, no upload, no model call
- [x] Copy has been run through the humanizer skill before commit (`CLAUDE.md`)
- [x] WCAG 2.2 AA, including the demonstration itself — severity carries three
      redundant channels, and the flag-to-sentence path is keyboard reachable and
      announced. Built to the standard; never audited by an independent tool
- [ ] The page holds up on a phone as well as a laptop, even though the product's upload
      flow is desktop-shaped — **open, needs a real device; see the note above**
- [x] Nothing else ships with it: no waitlist, pricing page, blog or second surface
