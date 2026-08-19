import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

// vite.config.ts exports a callback-form config, so it must be invoked with a
// configEnv before merging — mergeConfig cannot merge a function directly.
// Same constraint as apps/concept-mapping.
export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        environment: "jsdom",
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL("./", import.meta.url)),
      },
    })
  )
);
