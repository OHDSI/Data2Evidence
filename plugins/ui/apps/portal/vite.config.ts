import { cpSync, createReadStream, existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const D4L_ESM_DIR = fileURLToPath(
  new URL("../../node_modules/@d4l/web-components-library/dist/esm", import.meta.url)
);
const ASSETS_PREFIX = "/d2e/portal/assets/";

// @d4l/web-components-library is a Stencil lib: its components lazy-load exact-
// named .entry.js chunks at runtime. The loader resolves them relative to the
// assets dir (not via resourcesUrl), so the Stencil runtime must live there —
// copied into the build output for production and served from node_modules in dev.
function d4lWebComponents() {
  return {
    name: "d4l-webcomponents",
    closeBundle() {
      cpSync(
        D4L_ESM_DIR,
        fileURLToPath(new URL("../../resources/portal/assets", import.meta.url)),
        { recursive: true }
      );
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || "").split("?")[0];
        if (!url.startsWith(ASSETS_PREFIX)) return next();
        const rel = normalize(url.slice(ASSETS_PREFIX.length));
        if (rel.startsWith("..")) return next();
        const file = join(D4L_ESM_DIR, rel);
        if (!existsSync(file)) return next();
        res.setHeader("Content-Type", "application/javascript");
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // PUBLIC_URL is consumed via env.ts; keep CRA's /d2e/portal build default so
  // plugin/asset URLs resolve even when runtime env.js omits it.
  const raw = loadEnv(mode, process.cwd(), ["REACT_APP_", "VITE_", "PUBLIC_URL"]);
  const processEnv: Record<string, string> = {
    NODE_ENV: mode,
    PUBLIC_URL: "/d2e/portal",
    ...raw,
  };

  return {
    base: "/d2e/portal/",
    plugins: [react(), d4lWebComponents()],
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
