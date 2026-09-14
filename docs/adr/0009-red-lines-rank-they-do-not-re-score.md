# 9. A Signer's red lines rank the findings; they do not re-score them

## Decision
`docs/spec-v1.md` and `PRD.md` §5 both say a Signer's red lines "change the ranking and
severity of flags". Ranking and severity are not the same claim, and ticket 13 is where
the difference has to be settled. It is settled this way:

**Severity does not move.** It stays what ADR 0003 made it: a function of the clause's own
properties, computed in `lib/analysis/severity.ts` from what the wording says. The same
sentence is worth the same number on every Signer's screen, and ADR 0007 already holds it
still across jurisdictions on exactly that ground.

**Ranking moves, and a second named dimension carries the reason.** `RiskFlag` gains
`redLinesCrossed`, a list of the Signer's own lines this clause meets, each carrying their
sentence verbatim. Findings come back with everything that crosses a line first, then worst
first inside each group, then in document order. The flag list itself is unchanged in
membership: **red lines sort it and never filter it.**

**A clause Redline calls ordinary can sit at the top.** A three-month, paid-for, ten-mile
restriction is severity 1 and stays severity 1 — `PRD.md` §5 is explicit that marking it
higher would be crying wolf on the ordinary freelance contract. For a Signer whose standing
note reads "I do not sign non-competes", it is nonetheless the first thing on their page.
That case is the whole feature, and it is only expressible because the two dimensions are
separate.

**Red lines are an input to the reading, not only to the sort.** They are written into the
prompt that reads clauses (`redLinesBriefing`), so the reading is made with the Signer's
standard in hand and a clause that only matters because of something they wrote is reported
rather than passed over as unremarkable. Nothing is dropped afterwards on account of them.

**Matching is done in code and errs towards matching.** Which line meets which clause is a
keyword reading of the Signer's own words against the eight settled clause types
(`lib/analysis/red-lines.ts`), not a model's opinion — the same argument ADR 0003 makes
about severity, applied to somebody's standard. A refusal with a bound in it ("longer than
six months") reaches only clauses Redline already had something to say about; a refusal with
no bound reaches the clause type wherever it appears. Where the heuristic is wrong it is
wrong in the direction of showing the Signer a clause they said they cared about, which
costs them the second it takes to dismiss it.

**What the Signer sees.** The ranked index says how it is ordered — "Your lines first, then
worst first" — and a crossed finding carries the Signer's own sentence in the margin beside
the mark, with one line saying why it is there. The severity meter is untouched, so a mark
reading "noted" at the top of the page is explained rather than puzzling. Their standard is
edited in place on the same sheet as a standing document, and editing it reads the contract
already on screen again.

## Alternatives
- **Let a red line raise severity.** The most literal reading of the spec's wording, and
  defensible: `PRD.md` §5 sits the built-in thresholds under the heading "Red lines", which
  invites reading them as Redline's own defaults for a Signer to override. Rejected because
  it makes "severity, 3 of 4" mean two different things on two people's screens, and the
  number stops being defensible by pointing at the sentence — which is the property ADR 0003
  exists to give it. It would also collide with ADR 0007's invariant for no good reason: the
  jurisdiction tests would still pass, since they pass no red lines, but the principle they
  encode would no longer hold.
- **Filter the list to what crosses a line.** What the ticket warns against, and it would
  satisfy the screen. Rejected: the Signer would see fewer flags rather than a ranking that
  reflects what they care about, and a red line about payment would hide a non-compete they
  had not thought to write a line about. Over-flagging is the direction of error this
  product chose (ADR 0004); silence is not.
- **Ask the model which lines a clause crosses.** Fewer false matches than a keyword
  reading, probably. Rejected for ADR 0003's reason — a crossing a model asserted cannot be
  tested, argued with, or shown to a Signer as anything but an opinion — and because it
  would make the ranking non-deterministic between two runs over the same text and the same
  standard.
- **Weight the sort by how many lines a clause crosses.** Rejected: a clause that crosses
  three of somebody's lines is not three times a clause that crosses one, and counting would
  put a vaguely worded standing note above the sentence that will actually cost them.
- **Re-sort the existing result in the browser when red lines change.** Cheaper than another
  reading, and it would satisfy "re-ranks without re-uploading". Rejected because it makes
  red lines a post-filter in everything but name — the reading would never have been made
  with them, so a clause that only matters because of one would never be reported at all.

## Why
Severity answers "what does this wording do?" and a red line answers "what will I not sign?"
Those are different questions with different owners, and the product's whole claim is that
its answer to the first can be checked against the document. Folding the second into it
would cost that, for a gain — one number instead of two — that the Signer does not want
anyway: they need to see both that Redline reads a clause as standard and that they have
said they will not accept it, because that is precisely the disagreement they are about to
take to their client.

Ranking is also the thing the Signer actually depends on. `PRD.md` §4 test 7 measures the
feature by whether the ranking moves, and user story 6 is about what ten minutes at the top
of the list is spent on. Moving the order is not the weaker half of "ranking and severity";
it is the half that does the work.

## Consequences
- `RiskFlag.redLinesCrossed` is a required field, so a flag built anywhere without deciding
  what the Signer's standard says about it does not compile.
- `analyze()` orders by crossing, then severity, then document position. With no red lines
  recorded — every Signer without an account, and every earlier ticket's tests — the order
  is worst first and nothing else, unchanged.
- The severity invariants ADR 0003 and ADR 0007 established are untouched, and
  `tests/jurisdiction.test.ts` keeps comparing flags field by field without being loosened.
- `tests/red-lines.test.ts` asserts the thing `PRD.md` §4 test 7 is blunt about: one
  document, three standards, three different orders, with the same flags carrying the same
  severities and the same citations in each.
- The clause vocabulary now has a second list against it — the words a Signer uses when they
  mean each clause type — so adding a clause type means deciding what somebody would call
  it, not only what a dangerous one says.
- Red lines live in `public.red_lines` under the same row-level security as documents. The
  policies are written; whether a real database enforces them is proven by
  `tests/integration/signer-isolation.test.ts`, which needs a Supabase project and skips
  without one.
