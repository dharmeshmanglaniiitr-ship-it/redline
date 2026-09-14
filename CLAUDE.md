# CLAUDE.md

## What this is
Redline: upload a contract, lease, freelance agreement, or ToS; get a plain-English
summary, severity-ranked risk flags each citing its exact source sentence, a drafted
counter-offer per flag, a document-scoped Q&A box, an editable list of the user's own
red lines that drives the analysis, and a saved library of past documents.

## Stack (settled, not open for reinterpretation)
- Next.js (TypeScript, App Router), Tailwind CSS, deployed on Vercel.
- Supabase for auth and database.
- Model calls go through OpenRouter.
- Uploaded files are parsed in the browser. Only extracted text is ever stored —
  never the original file.

## Scope — build this and stop
Summary, ranked risk flags with citation, counter-offers, document Q&A, editable
red-lines, saved library. Nothing else.
Risk flags and counter-offers must account for the document's governing jurisdiction —
severity and enforceability assumptions vary by jurisdiction and are never asserted as
universal (ADR 0005).
If something looks like an obvious next step and isn't on that list, ask before
building it.
Excluded on purpose: payments/billing, OCR for scanned documents, sharing a document
between users. This version exists to prove the analysis can be trusted — OCR
undermines that, because a citation is worthless when the text it points at was
misread.

## Non-negotiable
- Every risk flag must cite the exact sentence it came from. A flag whose source
  can't be shown is a bug, not a missing feature.
- State only what the document says. Where the text doesn't support a claim, the
  product doesn't make it.
- Documents belong to one user. Use Supabase Row Level Security so no query can
  return another user's data.

## Standing rules
- Keep credentials in .env.local (gitignored). Never commit a secret — it's public
  the moment it's pushed and has to be rotated.
- Ask before adding a dependency.
- Don't write application code until PRD.md exists.
- All copy a user reads in this product, meaning the landing page, UI labels, error
  messages and empty states, has to be run through the humanizer skill before it is
  committed. Copy that reads as though a model wrote it is a defect, not a matter of
  taste.

## Read before building
- research/summary.md — the user research behind these decisions.
- PRD.md (once it exists) — the brief.

## Who you are writing for
The person who owns this product is a product manager, not an engineer. They do not
read code and do not use a terminal.

Write every explanation so a ten-year-old could follow it, and explain each technical
term the first time it comes up — including the ones that feel too obvious to mention.
Say what a command does and where it gets typed before you give the command. Prefer a
link or a dashboard page over a terminal command whenever both would work. When a
command really is the only route, offer it as `! <command>` so it runs here rather than
asking them to open a terminal.

Simple wording, not less information. They make real decisions from these answers, so
keep the trade-offs and the caveats — just say them plainly.
