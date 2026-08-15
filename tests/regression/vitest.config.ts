import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each scenario makes multiple HTTP requests; default 5s is too short.
    // Override with TEST_TIMEOUT_MS env var (e.g. set to 0 to disable).
    testTimeout: Number(process.env.TEST_TIMEOUT_MS ?? 120_000),
    // beforeAll warmup fires all HAR steps sequentially; needs the same budget as testTimeout.
    hookTimeout: Number(process.env.TEST_TIMEOUT_MS ?? 120_000),
    globalSetup: "./runner/globalSetup.ts",
  },
});
