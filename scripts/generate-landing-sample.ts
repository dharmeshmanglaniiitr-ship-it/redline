/**
 * Regenerates the landing page's worked example.
 *
 * Run it with `npm run sample` after anything that changes what the analysis produces:
 * a new severity threshold, different wording on a flag, a change to the fixture corpus.
 * `tests/landing-sample.test.ts` fails until it has been run, which is the point — the
 * page shows the analysis as it is now, or the suite says so.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  SAMPLE_FIXTURE,
  SAMPLE_MODULE_PATH,
  buildLandingSample,
  renderSampleModule,
} from "./landing-sample";

const sample = await buildLandingSample();
const path = fileURLToPath(new URL(`../${SAMPLE_MODULE_PATH}`, import.meta.url));

writeFileSync(path, renderSampleModule(sample), "utf8");

console.log(
  `${SAMPLE_MODULE_PATH}: ${sample.flags.length} flags and ${sample.cleared.length} cleared ` +
    `entries, read from tests/fixtures/${sample.fixture}.`
);
