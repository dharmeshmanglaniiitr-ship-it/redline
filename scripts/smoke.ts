/**
 * One contract, the whole pipeline, printed.
 *
 * `npm test` runs the analysis against a stub and asserts. This runs it against the live
 * model and shows you the result, which is the check no assertion makes: whether the model
 * that is actually configured can read a contract and come back with sentences this
 * document contains. Everything between the gateway and the print is the product's own —
 * `analyze()`, the citation check, the severity derivation — so a flag printed here is a
 * flag a Signer would have been shown, and a flag whose citation failed is one they would
 * never have seen.
 *
 * The document is a fixture (`tests/fixtures/`), because a smoke test that needed
 * somebody's real contract would not be run.
 *
 * Two things this deliberately does not do. It does not route around a provider that is
 * refusing: the provider pin, the fallback setting and the model id all stay where they
 * are (`lib/model/openrouter.ts`, `CLAUDE.md`), so a refusal is reported as a refusal
 * rather than answered by a different model nobody chose. And it never lets a run without
 * a live model read as one — with no credentials it says so in a banner, before and after
 * the findings, and the findings are the fixture stub's.
 *
 * Usage: npm run smoke
 */

import { analyze } from "@/lib/analysis/analyze";
import { createCitationVerifier } from "@/lib/analysis/citation";
import { detectJurisdiction, determineJurisdiction } from "@/lib/analysis/jurisdiction";
import type { RiskFlag } from "@/lib/analysis/result";
import { severityWord } from "@/lib/analysis/wording";
import { ModelCallError, openRouterAccess } from "@/lib/model/openrouter";
import type { ModelGateway } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { loadFixture } from "../tests/support/fixtures";
import { createStubModelGateway } from "../tests/support/stub-model";

/** The contract to run. All four settled clause types, at their dangerous end. */
const FIXTURE = "adhesion-contract.txt";

const RULE = "=".repeat(78);

/** Said loudly, twice, when no live model answered any part of this. */
const NOT_A_LIVE_RUN = [
  RULE,
  "!!  NO LIVE MODEL WAS CALLED.",
  "!!  Every finding in this run came from the fixture stub in",
  "!!  tests/support/stub-model.ts, which answers out of the fixture's own sidecar.",
  "!!  The run still goes through the analysis seam, the citation check and the",
  "!!  severity derivation, so the pipeline is exercised. Nothing here says how the",
  "!!  live model reads a contract.",
  RULE,
];

function say(line = ""): void {
  console.log(line);
}

/** The gateway to run with, and what to tell the reader about it. */
function chooseGateway(): { gateway: ModelGateway; live: boolean; note: string[] } {
  const access = openRouterAccess();

  if (access.outcome === "ready") {
    return {
      gateway: access.gateway,
      live: true,
      // The model id is never printed, because it is never written down here: it comes
      // from OPENROUTER_MODEL and this script has no business naming it.
      note: [
        "Model: the live OpenRouter gateway, on the provider pinned in",
        "       lib/model/openrouter.ts, with the model OPENROUTER_MODEL names.",
      ],
    };
  }

  return {
    gateway: createStubModelGateway(loadFixture(FIXTURE)),
    live: false,
    note: [
      `Model: none. ${access.missing.join(" and ")} ${
        access.missing.length === 1 ? "is" : "are"
      } not set, so there is nothing to call.`,
      `       Set ${access.missing.length === 1 ? "it" : "them"} in .env.local and run this ` +
        "again to check the live model.",
    ],
  };
}

async function run(): Promise<number> {
  const fixture = loadFixture(FIXTURE);
  const { gateway, live, note } = chooseGateway();

  say("Redline smoke run");
  say(`Document: tests/fixtures/${FIXTURE}, a fixture from this repo's corpus.`);
  for (const line of note) say(line);
  say();
  if (!live) {
    for (const line of NOT_A_LIVE_RUN) say(line);
    say();
  }

  // The two calls the product makes before it has findings, in the order it makes them:
  // the law first, because the wording on a finding names the law that answers it
  // (`docs/adr/0007`), and that cannot be written afterwards.
  const detected = await detectJurisdiction(fixture.text, gateway);
  const jurisdiction = determineJurisdiction(detected, null);

  say(
    jurisdiction.source === "undetermined"
      ? "Governing law: the document does not name one, so the reading assumes nothing."
      : `Governing law: ${jurisdiction.name}`
  );
  if (detected !== null) say(`  read from: ${detected.sourceSentence}`);
  say();

  const { flags, checkedClean } = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction },
    gateway
  );

  // The same check that stands between a model's quote and a Signer, run again over what
  // came back, so this prints whether each citation holds rather than assuming it does.
  // `analyze()` has already dropped anything that failed it, which is why a "no" here
  // would be a bug in the seam rather than a bad answer from a model.
  const verifier = createCitationVerifier(fixture.text);
  let verified = 0;

  say(`${flags.length} ${flags.length === 1 ? "flag" : "flags"}, worst first.`);
  say();

  flags.forEach((flag, index) => {
    const holds = verifier.verifies(flag.sourceSentence);
    if (holds) verified += 1;

    say(`[${index + 1}] severity ${flag.severity} of 4 (${severityWord(flag.severity)})`);
    say(`    ${flag.title}`);
    say(`    clause type: ${flag.clauseType}`);
    say(`    worked out from: ${propertiesOf(flag)}`);
    say(`    source sentence: ${flag.sourceSentence}`);
    say(`    citation: ${holds ? "verified against the document" : "DOES NOT VERIFY"}`);
    say();
  });

  say(
    `Checked and clean: ${checkedClean.length === 0 ? "nothing" : checkedClean.join(", ")}.`
  );
  say(
    flags.length === 1
      ? `${verified} of 1 flag kept its citation and would have reached a Signer.`
      : `${verified} of ${flags.length} flags kept their citation and would have reached a Signer.`
  );

  if (!live) {
    say();
    for (const line of NOT_A_LIVE_RUN) say(line);
  }

  return verified === flags.length && flags.length > 0 ? 0 : 1;
}

/**
 * What the severity was worked out from: the properties the document stated, and the ones
 * it left out. Severity is derived in code from these (`docs/adr/0003`), so printing them
 * beside the number is what makes the number something a reader can argue with.
 */
function propertiesOf(flag: RiskFlag): string {
  const stated = Object.entries(flag.properties).map(([name, value]) => `${name}=${String(value)}`);
  const silent = flag.unstatedProperties.map((name) => `${name} not stated`);
  const parts = [...stated, ...silent];
  return parts.length === 0 ? "no severity properties for this clause type" : parts.join(", ");
}

/**
 * What went wrong, in the register a person reading a terminal needs.
 *
 * A stack trace is the wrong answer here: the failures this script actually meets are a
 * provider refusing the call and a model answering in the wrong shape, and neither is a
 * bug in this file. The 429 in particular is expected at the time of writing — the pinned
 * provider's shared pool is exhausted — and the right response to it is to say so, not to
 * let a second provider answer instead.
 */
function explain(cause: unknown): string[] {
  if (cause instanceof ModelCallError) {
    const lines = ["The call to the model did not come back.", `  ${cause.message}`];
    if (cause.message.includes("429")) {
      lines.push(
        "",
        "  429 is the pinned provider refusing on a shared rate limit. Nothing here",
        "  routes around it: the provider stays pinned, fallbacks stay off, and no model",
        "  id is written into this repo (CLAUDE.md). Wait and run it again.",
      );
    }
    lines.push("", "Nothing about live model behaviour was checked by this run.");
    return lines;
  }

  if (cause instanceof ModelResponseError) {
    return [
      "The model answered, and the answer was not the shape that was asked for.",
      `  ${cause.message}`,
      "",
      "An answer that does not narrow to the shape asked for never reaches a Signer, so",
      "nothing would have been shown and nothing stored.",
    ];
  }

  return [
    "The smoke run stopped.",
    `  ${cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)}`,
  ];
}

try {
  process.exitCode = await run();
} catch (cause) {
  say();
  for (const line of explain(cause)) say(line);
  process.exitCode = 1;
}
