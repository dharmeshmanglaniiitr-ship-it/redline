# The spec is not here

It is at [`docs/spec-v1.md`](../../docs/spec-v1.md), 311 lines, covering all ten v1
capabilities as user stories plus the implementation and testing decisions behind them.
The tickets beside this file, in `issues/`, were cut from it and are numbered in
dependency order.

This pointer exists because the spec was written to `docs/` rather than to this folder,
while prompts and instructions that talk about "the spec under `.scratch/`" expect to
find it here. Moving it would break the four places that reference `docs/spec-v1.md`:
`README.md`, both surface briefs under `.impeccable/surfaces/`, and the spec's own
cross-references. Copying it would create a second spec free to drift from the first.

Read `docs/spec-v1.md`. There is no other spec.
