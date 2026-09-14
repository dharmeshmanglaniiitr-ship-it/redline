/**
 * What a saved document's reading comes back as, for the client half of the sheet.
 *
 * Apart from the page because a client component may not import a server module, and the
 * three arms are three different things to say. A reading that was kept is drawn. A
 * document kept with no reading is a real state — the deployment had no model access, or
 * the analysis did not come back and the Signer kept the wording anyway — and it is said
 * out loud, because a saved document showing an empty report would read as a contract with
 * nothing wrong in it. A reading that no longer holds up is the third, and it is never
 * quietly drawn as a shorter one (`docs/adr/0010`).
 */

import type { AnalysisResult } from "@/lib/analysis/result";

export type KeptReading =
  | {
      readonly status: "kept";
      readonly result: AnalysisResult;
      /** The day it was made, already written out (`app/(app)/library/kept-on.ts`). */
      readonly readOn: string;
    }
  | { readonly status: "none" }
  /** Stored, but it no longer checks out against the wording it was saved with. */
  | { readonly status: "unreadable" };
