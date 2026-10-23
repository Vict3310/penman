import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Loaded as ESM (`.mts`), so `import.meta.dirname` is used rather than
 * `__dirname`. The package deliberately does not set `"type": "module"`
 * because `tailwind.config.ts` relies on CommonJS `require`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      // See tests/stubs/server-only.ts for why this alias exists.
      "server-only": resolve(import.meta.dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Several suites boot their own embedded Postgres (PGlite) and apply all
    // five migrations in `beforeAll`. That is real work — roughly 5 seconds per
    // engine before any test runs — so the 10 second default is too tight once
    // suites start in parallel on a modest machine. The assertions themselves
    // keep the default per-test timeout.
    hookTimeout: 60_000,
    // Four suites each boot their own embedded Postgres. Letting all of them
    // initialise at once on a busy machine starves the CPU and turns a 4-second
    // engine boot into a timeout, so cap concurrency; the pure unit suites are
    // milliseconds and lose nothing.
    maxWorkers: 2,
  },
});
