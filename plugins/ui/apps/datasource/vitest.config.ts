import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: "@d2e/ui/tokens.css",
        replacement: path.resolve(
          __dirname,
          "../../libs/d2e-ui/src/tokens/tokens.css",
        ),
      },
      {
        find: "@d2e/ui",
        replacement: path.resolve(__dirname, "../../libs/d2e-ui/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // @ohdsi/atlas-ui wraps Vuetify components, which import .css side-effect
    // files directly. Node's ESM loader can't handle those; inlining vuetify
    // routes it through Vite's own transform pipeline instead (same fix
    // vue-mri-ui-lib's vite.config.ts test.deps.inline uses).
    server: {
      deps: {
        inline: ["vuetify", "@ohdsi/atlas-ui"],
      },
    },
  },
});
