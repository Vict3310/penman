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
  },
});
