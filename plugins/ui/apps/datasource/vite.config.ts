import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";
import { vuetifyDir } from "./vite.resolve-deps";

// vue is externalized (Atlas3's host shims it); CSS stays JS-injected rather
// than split into style.css, which 404s on parcel mounts when absent.
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [vue(), vuetify({ autoImport: true }), cssInjectedByJsPlugin()],
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
          replacement: path.resolve(
            __dirname,
            "../../libs/d2e-ui/src/index.ts",
          ),
        },
        // The bundled @d2e/ui source imports `vuetify/components` with a bare
        // specifier; resolve it to the installed copy so the isolated atlas
        // build (npm install --workspaces=false) can find it. Mirrors
        // vue-mri-ui-lib.
        {
          find: /^vuetify\/(components|directives)(\/(.+))?$/,
          replacement: path.join(vuetifyDir, "lib/$1$2"),
        },
      ],
    },
    build: {
      outDir: isProduction
        ? path.resolve(__dirname, "dist-atlas")
        : path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, "src/main.ts"),
        formats: ["system"],
        fileName: "index",
      },
      rollupOptions: {
        external: ["vue"],
        output: {
          format: "system",
          globals: { vue: "vue" },
        },
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "production",
      ),
    },
  };
});
