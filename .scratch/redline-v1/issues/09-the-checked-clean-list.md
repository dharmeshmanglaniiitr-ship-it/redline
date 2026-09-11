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

**Status:** ready-for-agent

- [ ] A defined clause checklist for freelance contracts exists as data
- [ ] The analysis reports which checklist entries it examined and found clean
- [ ] The balanced-contract fixture yields zero high-severity flags *and* a populated
      checked-clean list
- [ ] Entries are named specifically enough that a Signer knows what was checked
- [ ] No low-severity finding is manufactured on a clean document
- [ ] The four clause types with settled thresholds are covered; the remaining four are
      carried as checklist members whose thresholds ticket 10 settles
