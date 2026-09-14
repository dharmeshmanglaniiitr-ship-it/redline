/**
 * Producing the landing page's worked example from a fixture contract.
 *
 * The page is prerendered and calls no model, so the example it shows has to exist before
 * the build does. This is the thing that makes it: it runs the real `analyze()` seam over
 * a contract from `tests/fixtures/`, checks every citation the way the product checks one,
 * and writes the result out as a TypeScript module the page imports.
 *
 * It is shared between the generator and `tests/landing-sample.test.ts` on purpose. The
 * test builds the sample again from here and compares it with the committed file, which
 * is the only thing standing between a landing page and a picture of an older product: a
 * change in how a flag is titled, ranked or explained fails the suite until the file is
 * regenerated.
 *
 * The gateway is the fixture-backed stub the test suite uses, and the sample says so,
 * because the live model is unreachable from this build (`.scratch/redline-v1/AGENT-BRIEF.md`)
 * and because a page implying a live model wrote its demonstration would be making exactly
 * the kind of unsupported claim this product exists to refuse.
 */

import { analyze } from "@/lib/analysis/analyze";
import { CHECKLIST_ENTRIES } from "@/lib/analysis/clauses";
import { createCitationVerifier } from "@/lib/analysis/citation";
import { detectJurisdiction, determineJurisdiction } from "@/lib/analysis/jurisdiction";
import { checklistEntryName, severityWord } from "@/lib/analysis/wording";
import type {
  LandingSample,
  SampleClause,
  SampleFlag,
} from "@/lib/landing/sample";
import { clauseReferenceIn, markUpDocument } from "@/lib/text/marking";

import { loadFixture } from "../tests/support/fixtures";
import { createStubModelGateway } from "../tests/support/stub-model";

/**
 * The contract the page is worked over.
 *
 * The adhesion contract, because it carries all four settled clause types at their
 * dangerous end, which is what makes the demonstration worth reading. It is a fixture
 * written for this repo's test corpus — the page says so by name, and nothing about it
 * belongs to anybody.
 */
export const SAMPLE_FIXTURE = "adhesion-contract.txt";

/** Where the generated module is written, relative to the repo root. */
export const SAMPLE_MODULE_PATH = "lib/landing/sample-analysis.ts";

/**
 * Run the analysis over the sample contract and collect what the landing page shows.
 *
 * The jurisdiction is read from the document rather than assumed, on the same two calls
 * the product makes (`app/(app)/review/actions.ts`), because the cost explanation on a
 * non-compete names the law that answers it and would otherwise be written for a contract
 * that governs nothing (`docs/adr/0007`).
 *
 * @throws when a citation does not verify against the sample contract. The product drops
 *   such a flag silently and carries on, which is right for a Signer reading their own
 *   document and wrong here: a demonstration missing a flag is a demonstration that has
 *   quietly stopped showing what the analysis does.
 */
export async function buildLandingSample(): Promise<LandingSample> {
  const fixture = loadFixture(SAMPLE_FIXTURE);
  const gateway = createStubModelGateway(fixture);

  const detected = await detectJurisdiction(fixture.text, gateway);
  const jurisdiction = determineJurisdiction(detected, null);

  const { flags, checkedClean } = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction },
    gateway
  );

  // The same check the product runs before a flag reaches a screen, run again here so a
  // citation that does not hold up stops the generator rather than reaching the page.
  const verifier = createCitationVerifier(fixture.text);
  for (const flag of flags) {
    if (!verifier.verifies(flag.sourceSentence)) {
      throw new Error(
        `${flag.id} quotes a sentence ${SAMPLE_FIXTURE} does not contain: ${flag.sourceSentence}`
      );
    }
  }
  if (flags.length === 0) {
    throw new Error(`${SAMPLE_FIXTURE} produced no flags, so there is nothing to show`);
  }

  return {
    fixture: SAMPLE_FIXTURE,
    producedBy: "fixture-stub",
    jurisdiction:
      jurisdiction.source === "document"
        ? { name: jurisdiction.name, sourceSentence: jurisdiction.sourceSentence }
        : null,
    flags: flags.map(
      (flag): SampleFlag => ({
        id: flag.id,
        clauseType: flag.clauseType,
        severity: flag.severity,
        severityWord: severityWord(flag.severity),
        title: flag.title,
        cost: flag.cost,
        hedgeNote: flag.hedgeNote,
        clauseReference: clauseReferenceIn(flag.sourceSentence),
        sourceSentence: flag.sourceSentence,
      })
    ),
    clauses: markedClauses(fixture.text, flags),
    cleared: checkedClean.map((entry) => ({ entry, name: checklistEntryName(entry) })),
    checklistTotal: CHECKLIST_ENTRIES.length,
  };
}

/**
 * The blocks of the contract that carry a mark, with the document's own heading above
 * each one.
 *
 * Only the marked blocks, because the page is a demonstration and not a document reader —
 * the whole contract is on the review screen, where a Signer has their own document open.
 * Every character of what is kept is the fixture's, cut by `markUpDocument` at the
 * boundaries the citations gave, so the sample quotes the sample contract rather than
 * paraphrasing it.
 */
function markedClauses(
  documentText: string,
  citations: readonly { id: string; sourceSentence: string }[]
): SampleClause[] {
  const blocks = markUpDocument(documentText, citations);

  return blocks
    .map((block, index) => ({ block, heading: headingBefore(blocks, index) }))
    .filter(({ block }) => block.flagIds.length > 0)
    .map(({ block, heading }) => ({
      heading,
      spans: block.spans.map((span) => ({ text: span.text, flagId: span.flagId })),
      flagIds: [...block.flagIds],
    }));
}

/** A contract's numbered section heading — "4. FEES AND PAYMENT" — or null. */
function headingBefore(
  blocks: readonly { spans: readonly { text: string }[] }[],
  index: number
): string | null {
  const previous = blocks[index - 1];
  if (previous === undefined) return null;
  const text = previous.spans.map((span) => span.text).join("").trim();
  return /^\d+(?:\.\d+)*\.?\s+[A-Z][A-Z\s,&-]*$/.test(text) ? text : null;
}

/**
 * The generated module, as text.
 *
 * Written from here rather than by the generator so the test can compare the committed
 * file with what would be written today, character for character. JSON is valid
 * TypeScript for a value of this shape, so the data is serialised as JSON and annotated
 * with the type it has to satisfy — which means a hand-edit that breaks the shape is a
 * compile error rather than a surprise on the page.
 */
export function renderSampleModule(sample: LandingSample): string {
  return [
    "/**",
    " * The landing page's worked example, as the analysis produced it.",
    " *",
    ` * Generated from tests/fixtures/${sample.fixture} by \`npm run sample\`. Do not edit by`,
    " * hand: `tests/landing-sample.test.ts` runs the analysis again and fails when this file",
    " * and the analysis disagree, so an edit here is a failing test rather than a change.",
    " */",
    "",
    'import type { LandingSample } from "./sample";',
    "",
    `export const LANDING_SAMPLE: LandingSample = ${JSON.stringify(sample, null, 2)};`,
    "",
  ].join("\n");
}
