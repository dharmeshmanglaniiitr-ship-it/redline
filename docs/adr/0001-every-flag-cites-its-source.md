# 1. Every flag cites its source

## Decision
Every risk flag Redline produces must quote the exact sentence from the uploaded
document that it is based on. If the system cannot point to that sentence, it does
not produce the flag. This is treated as a bug, not a formatting preference — a
missing citation is a defect in the analysis itself, not a cosmetic gap in how a
correct analysis is displayed.

## Alternatives
- Let the model describe risks in its own words, with no quoted source — closer to
  how a human summarizer talks, but nothing a reader could check against the
  document.
- Cite a paragraph or section instead of a sentence — less precise, and it pushes
  the work of finding the actual risky wording back onto the reader.
- Show a citation only when the model happens to produce one, and fall back to an
  unsourced flag otherwise — keeps more flags on screen but reintroduces exactly the
  failure mode this decision exists to prevent.

## Why
A reader can select any flag, find the quoted sentence in their own document, and
confirm the flag is really talking about something that's actually there — without
having to trust the model's judgment or re-read the whole contract themselves. The
product's output is checkable, not just plausible-sounding.

## Consequences
- The model cannot flag a real risk it can only infer from the document's overall
  structure or absence of a clause — silence in the text is not citable, so those
  risks go unflagged rather than shown without a source.
- Every generation step needs sentence-level grounding, not just risk detection —
  this is a harder prompting/retrieval problem than free-form summarization.
- Testing must check citation accuracy (does the quoted text exist verbatim in the
  document?), not just whether a flag is reasonable-sounding.
- Paraphrased or reformatted source text is not an acceptable citation, even if
  materially accurate — it must match the document.
