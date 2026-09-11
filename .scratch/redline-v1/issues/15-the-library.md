# 15: The library

**What to build:** A Signer's past documents stay. They can come back months later and
check what they agreed to, and opening a saved document shows them what the analysis said
rather than making them re-run it to remember.

Only extracted text is stored, never the original file. Everything here is covered by the
per-Signer isolation established in ticket 05 — a Signer's library is theirs alone.

**One thing to settle before building.** The spec carries this as an open question: stored
analyses and current model output will diverge as prompts change. Whether a returning
Signer sees the stored analysis, a fresh re-run, or both is not decided. Decide it as part
of this ticket rather than defaulting into one silently — a Signer who sees a re-run when
they expected the original has been shown something different from what they acted on,
and a Signer who sees a stale stored analysis may be reading conclusions the current
system would no longer draw.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] A Signer sees a list of the documents they have analysed
- [ ] Opening a saved document shows its analysis without requiring a re-run
- [ ] Only extracted text is stored; no original file is retained
- [ ] The library is covered by per-Signer Row Level Security, verified by a
      cross-Signer read test
- [ ] The stored-versus-re-run question is explicitly decided, and the Signer can tell
      which they are looking at
