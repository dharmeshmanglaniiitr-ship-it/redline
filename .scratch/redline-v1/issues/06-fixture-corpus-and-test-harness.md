# 06: Fixture corpus and test harness

**What to build:** The contracts every later claim gets tested against. The spec is
direct about the stakes: there is no prior art here, so these fixtures become the prior
art for everything after.

A set of freelance contracts with known planted clauses at known severities. Critically,
it must include **paired** fixtures that differ only in the scope of a single clause —
an IP assignment limited to the deliverable against one that also claims pre-existing
tools and methods. That pair is what later distinguishes a real analysis from a category
lookup table; without it, ADR 0003 is untestable.

Also build the harness those fixtures run through: tests drive the analysis seams with
document text and assert on returned structure. No test asserts on prompt text, model
identity, or the sequence of internal calls — those change constantly without the
behaviour changing, and tests coupled to them get deleted rather than maintained. Because
model output varies between runs, every assertion is on an invariant: a quoted sentence
appears verbatim, one document ranks above another, a refusal occurred, a checklist entry
was reported.

Treat the corpus as encoding an assumption worth revisiting rather than established
fact — `PRD.md` §8 records that no verified first-person account of a freelancer harmed
by a contract clause exists in the research, so these thresholds are reasoned judgments,
not observed failures.

**Blocked by:** 01

**Status:** done — 2026-09-13. Eight contract fixtures with sidecars, three one-line
pairs, an image-only PDF, and a harness that runs the seams with no browser, network or
key. Citation integrity is asserted first and mutation-checked.

- [x] Fixtures exist for each of the four clause types with settled thresholds, seeded
      at their dangerous threshold
- [x] Paired fixtures exist that differ only in one clause's scope, for the clause types
      where that distinction is defined
- [x] A genuinely balanced contract fixture exists, with nothing planted in it
- [x] An image-only PDF fixture exists for the unreadable case
- [x] A set of questions the documents do not answer exists, for the Q&A refusal case
- [x] Each fixture records what was planted and at what severity, so tests assert against
      a stated expectation rather than a guess
- [x] The harness runs the seams without a browser or network and asserts on invariants,
      never on exact model wording
