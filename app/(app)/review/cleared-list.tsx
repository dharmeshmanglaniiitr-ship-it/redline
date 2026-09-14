/**
 * The clean bill: what Redline went through on this contract and found nothing on.
 *
 * This is the quiet half of the report, and `docs/adr/0004` is why it is on the screen
 * at all. A document with no marks on it and nothing else said is indistinguishable from
 * a document nothing looked at, and the second reading is the one that costs a Signer
 * money. So the list is specific: every entry is named, the count says how many of the
 * checklist came back clean out of how many there are, and the note says what a missing
 * line means.
 *
 * `DESIGN.md` gives this component its form — two columns at 640px and above, hairline
 * rules between rows, a 20px blue-pencil check leading each one. Blue pencil appears
 * here and in the heading and nowhere else on the sheet: vermilion is the correcting
 * hand, and nothing on this list is a correction.
 */

import { CHECKLIST_ENTRIES, type ChecklistEntry } from "@/lib/analysis/clauses";
import { checklistEntryName } from "@/lib/analysis/wording";

import { ProofMark } from "../_components/galley";

/** Blue pencil's own label, which is `DESIGN.md`'s LABEL in the other marking hand. */
const PENCIL_LABEL = "text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-pencil";

export function ClearedList({ cleared }: { cleared: readonly ChecklistEntry[] }) {
  const total = CHECKLIST_ENTRIES.length;

  return (
    <section aria-labelledby="checked-clean" className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-rule pt-6">
        <h2 id="checked-clean" className={PENCIL_LABEL}>
          Checked, nothing to report
        </h2>
        <span className="numeric text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          {cleared.length} of {total} came back clean
        </span>
      </div>

      <p className="mt-5 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft">
        A line here means Redline read your contract on that point and found nothing you
        need to take up. Anything missing from the list is either marked in the wording
        below, or something Redline could not settle from the text. It weighs four of the
        eight against a written rule: acceptance, ownership, what you can do afterwards,
        and an early exit. On the other four it can tell you it found nothing, but it has
        no rule yet for how bad one of those gets.
      </p>

      {cleared.length === 0 ? (
        <p className="mt-6 max-w-[58ch] text-[0.94rem] leading-[1.55] text-ink-soft">
          Nothing on the checklist came back clean. Every line is either marked in the
          wording below or something Redline could not settle from the text.
        </p>
      ) : (
        <ul className="mt-6 grid border-t border-rule sm:grid-cols-2 sm:gap-x-10">
          {cleared.map((entry) => (
            <li
              key={entry}
              className="flex items-start gap-3 border-b border-rule py-3.5 text-[0.94rem] leading-[1.55] text-pencil"
            >
              <ProofMark kind="check" className="mt-px h-5 w-5" />
              <span>{checklistEntryName(entry)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
