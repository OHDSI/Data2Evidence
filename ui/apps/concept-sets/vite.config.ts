import path from "path";
import fs from "fs";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import basicSsl from "@vitejs/plugin-basic-ssl";

function copyStencilEntryFiles(): Plugin {
  return {
    name: "copy-stencil-entry-files",
    writeBundle(options) {
      const outDir = options.dir || "dist";
      const d4lEsmDir = path.resolve(__dirname, "../../node_modules/@d4l/web-components-library/dist/esm");

      if (!fs.existsSync(d4lEsmDir)) {
        return;
      }

      const files = fs.readdirSync(d4lEsmDir);
      const entryFiles = files.filter(f => f.endsWith(".entry.js"));

      entryFiles.forEach(file => {
        fs.copyFileSync(path.join(d4lEsmDir, file), path.join(outDir, file));
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  const isBuild = command === "build";

  return {
    mode,
    define: { "process.env.NODE_ENV": `"${mode}"` },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
        },
      },
    },
    plugins: [
      cssInjectedByJsPlugin(),
      react(),
      basicSsl({
        name: "concept-sets-localhost",
        domains: ["localhost"],
        certDir: "./.devServer/cert",
      }),
      copyStencilEntryFiles(),
    ],
    optimizeDeps: {
      include: ["react", "react-dom", "single-spa", "single-spa-react"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
      outDir: isProduction
        ? path.resolve(__dirname, "../../resources/concept-sets")
        : path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      minify: isProduction,
      lib: {
        entry: path.resolve(__dirname, "src/lifecycles.tsx"),
        fileName: () => "lifecycles.js",
        formats: ["system"],
      },
      rollupOptions: {
        treeshake: true,
        onwarn(warning, warn) {
          // Suppress warnings about /*@__PURE__*/ comments in @d4l/web-components-library
          if (
            warning.code === "INVALID_ANNOTATION" &&
            warning.loc?.file?.includes("@d4l/web-components-library")
          ) {
            return;
          }
          warn(warning);
        },
        ...(isBuild && isProduction
          ? {
              external: [],
              output: {
                entryFileNames: "lifecycles.js",
                format: "system",
              },
            }
          : {
              external: [],
            }),
      },
    },
    server: {
      port: 8082,
      cors: true,
    },
    preview: {
      port: 8082,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
