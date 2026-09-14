/**
 * Runs one of this repo's TypeScript scripts on Node, with the repo's own import style.
 *
 * Node 24 executes TypeScript directly, so a script here needs no build step and no
 * bundler — but it resolves modules the way the web does, and this codebase is written
 * for a bundler: `@/lib/...` for the project root and no file extension on a relative
 * import. Rather than write the scripts in a second dialect, the two differences are
 * closed here, in `node:module`'s resolve hook: `@/` becomes a path from the repo root,
 * and a specifier with no extension is tried as `.ts` and then `.tsx`.
 *
 * Nothing is installed for this. Adding a TypeScript runner would be adding a dependency,
 * which `CLAUDE.md` says to ask about first, and nothing here needs one.
 *
 * Usage: node --experimental-transform-types scripts/run.mjs scripts/smoke.ts
 */

import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);

/** The first of these that exists on disk, for a specifier written without an extension. */
function fileFor(path) {
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const absolute = specifier.startsWith("@/")
      ? new URL(specifier.slice(2), ROOT)
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:")
        ? new URL(specifier, context.parentURL)
        : null;

    if (absolute !== null) {
      const file = fileFor(fileURLToPath(absolute));
      if (file !== null) return { url: pathToFileURL(file).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});

const target = process.argv[2];
if (target === undefined) {
  console.error("run.mjs needs the script to run, for example scripts/smoke.ts");
  process.exit(2);
}

await import(pathToFileURL(target).href);
