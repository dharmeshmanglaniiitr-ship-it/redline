# 09: The checked-clean list

**What to build:** A Signer with a genuinely fair contract gets told it is fair, by name.
Not a generic "looks good", and not a manufactured low-severity finding invented to avoid
looking idle — a specific list of what Redline examined and found nothing on.

This is what lets a quiet report mean "we looked" rather than "we found nothing", and it
is the difference between a Signer signing with confidence and hunting for a catch the
tool implied but never named.

The checklist is data, not prose. Redline carries a defined clause checklist for
freelance contracts, and the analysis reports which entries it examined and cleared.
Without a real checklist underneath, "checked and came back clean" is not a claim that
can be true or false.

Note the shape of the test: zero flags with an empty checklist is indistinguishable from
not having looked at all. Both halves have to hold.

**Blocked by:** 08

**Status:** done — 2026-09-14. `analyze()` makes a third gateway call, a checklist examination
examination covering all eight entries, and `checkedClean` is derived from it and the
flags together by `lib/analysis/checklist.ts`. The review screen renders the cleared list
per `DESIGN.md`. `npx tsc --noEmit`, `npm test` (157 passing, the Supabase isolation test
still skipped for want of a database) and `npm run build` are green. The live model is
still unreachable, so none of this has been run against a real model.

- [x] A defined clause checklist for freelance contracts exists as data
      (`CHECKLIST_ENTRIES`, built in ticket 08, now consumed rather than duplicated)
- [x] The analysis reports which checklist entries it examined and found clean
- [x] The balanced-contract fixture yields zero high-severity flags *and* a populated
      checked-clean list — both halves asserted in one test
      (`tests/checked-clean.test.ts`)
- [x] Entries are named specifically enough that a Signer knows what was checked
      (`checklistEntryName`, run through the humanizer; a test refuses the kebab-case
      identifiers on the screen)
- [x] No low-severity finding is manufactured on a clean document
- [x] The four clause types with settled thresholds are covered; the remaining four are
      carried as checklist members whose thresholds ticket 10 settles

**The honest limit on four of the eight entries — closed by ticket 10.** One-sided
indemnity, uncapped liability, auto-renewal and unilateral change were examined by the
checklist pass and could be reported clean, which `PRD.md` §5 requires or the clean bill
is not a real claim. What they could not get was the second check the settled four get: a
flag against the entry overturns a clean claim in code, and with no severity rule there
was no flag to overturn it with. So on those four a clean line meant "read, nothing to
raise" and a clause that *was* found landed in neither list — not flagged and not
cleared, with the screen making no claim about it.

Ticket 10 settled their thresholds in `docs/adr/0008`, which closed this with no change
to `lib/analysis/checklist.ts`: `clearedList` subtracts their flags exactly as it
subtracts the others. `tests/checked-clean.test.ts` now asserts that on all four.
