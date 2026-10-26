import { cpSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// @d4l/web-components-library is a Stencil lib: its components lazy-load exact-
// named .entry.js chunks at runtime. The bundled loader resolves those chunks
// relative to its own output chunk (…/assets/index-*.js), not via resourcesUrl,
// so the Stencil runtime must sit alongside it in Vite's assets dir.
function copyD4lWebComponents() {
  return {
    name: "copy-d4l-webcomponents",
    closeBundle() {
      cpSync(
        fileURLToPath(new URL("../../node_modules/@d4l/web-components-library/dist/esm", import.meta.url)),
        fileURLToPath(new URL("../../resources/portal/assets", import.meta.url)),
        { recursive: true }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const raw = loadEnv(mode, process.cwd(), ["REACT_APP_", "VITE_"]);
  const processEnv: Record<string, string> = { NODE_ENV: mode, ...raw };

  return {
    base: "/d2e/portal/",
    plugins: [react(), copyD4lWebComponents()],
    resolve: {
      alias: {
        // @portal/plugin ships only a webpack UMD build whose named exports
        // Rollup can't read; compile its source directly instead.
        "@portal/plugin": fileURLToPath(
          new URL("../../libs/portal-plugin/src/index.ts", import.meta.url)
        ),
        // Route every dist/loader import (portal + @portal/components) to the
        // single copied Stencil runtime so entry chunks don't desync.
        "@d4l/web-components-library/dist/loader": fileURLToPath(
          new URL("./src/webcomponents/d4lLoaderShim.ts", import.meta.url)
        ),
      },
    },
    define: {
      "process.env": JSON.stringify(processEnv),
      global: "globalThis",
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "https://localhost:41100",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "../../resources/portal",
      emptyOutDir: true,
      chunkSizeWarningLimit: 4000,
    },
  };
});
