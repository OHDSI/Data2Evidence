import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

// The app's vite.config.ts exports a callback-form config, so it must be
// invoked with a configEnv before merging — mergeConfig cannot merge a
// function directly.
export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL("./", import.meta.url)),
      },
    })
  )
);
