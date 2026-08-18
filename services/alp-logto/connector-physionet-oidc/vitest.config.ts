import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tsconfig.json already declares `types: ["vitest/globals"]`, but nothing
    // enabled globals at runtime, so `describe`/`it`/`expect` were undefined
    // and both suites failed to collect. No CI workflow runs this package, so
    // that went unnoticed.
    globals: true,
  },
});
