import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Strips the external Google Fonts @import that @nlux/themes/nova.css injects
function stripRemoteFontImportPlugin(): Plugin {
  return {
    name: "strip-remote-font-import",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".css") || !code.includes("fonts.googleapis.com")) {
        return null;
      }
      return {
        code: code.replace(
          /@import\s+url\((['"]?)https?:\/\/fonts\.googleapis\.com[^)]*\1\);?/g,
          ""
        ),
        map: null,
      };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  const isBuild = command === "build";
  const entryFile = "lifecycles.tsx";

  console.log("Production :", isProduction);
  console.log("Build      :", isBuild);
  console.log("Entry      :", entryFile);

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
      stripRemoteFontImportPlugin(),
      cssInjectedByJsPlugin(),
      react(),
      basicSsl({
        name: "notebook-ui-localhost",
        domains: ["localhost"],
        certDir: "./.devServer/cert",
      }),
    ],
    optimizeDeps: {
      include: ["react", "react-dom", "single-spa", "single-spa-react"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
      outDir: isProduction
        ? path.resolve(__dirname, "../../resources/notebook-ui")
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
          // Suppress warnings about /*@__PURE__*/ comments
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
      port: 8084,
      cors: true,
    },
    preview: {
      port: 8084,
    },
  };
});
