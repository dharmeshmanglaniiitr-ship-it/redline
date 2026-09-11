# 13: Red lines as a re-ranking input

**What to build:** A Signer records what they personally refuse to accept, and the
analysis reflects it. They edit their red lines and a document they have already uploaded
re-ranks — without re-uploading it. Their red lines persist across documents, so they are
not restated for every contract.

The implementation decision that matters: **red lines are an input to the analysis, not a
post-filter.** They change the severity and ranking of flags rather than hiding rows from
a fixed result set. An implementation that filters output would satisfy the screen while
failing the feature — the Signer would see fewer flags, but not a ranking that reflects
what they actually care about.

The test is blunt about the stakes. If the same document analysed under two different
red-line sets produces identical output, the feature is decorative.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] A Signer can record and edit their own red lines
- [ ] Red lines persist across documents and across sessions, scoped to that Signer
- [ ] Editing red lines re-ranks an already-uploaded document without re-uploading it
- [ ] Red lines feed the analysis as an input, changing severity and ranking — not
      filtering a fixed result
- [ ] The same document under two different red-line sets ranks differently
- [ ] Red lines are covered by the same per-Signer isolation as documents
