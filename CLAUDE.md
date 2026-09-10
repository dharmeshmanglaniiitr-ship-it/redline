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

## Read before building
- research/summary.md — the user research behind these decisions.
- PRD.md (once it exists) — the brief.
