import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Reads the "@/*" alias out of tsconfig.json, so a test imports a module by the
    // same specifier the application uses.
    tsconfigPaths: true,
  },
  test: {
    // The analysis seams are pure functions over text. They run in Node, with no
    // browser and no network, and the test runner needs nothing more either.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
