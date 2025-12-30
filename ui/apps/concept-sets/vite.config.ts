import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import basicSsl from "@vitejs/plugin-basic-ssl";

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
      cssInjectedByJsPlugin(),
      react(),
      basicSsl({
        name: "concept-sets-localhost",
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
    },
    preview: {
      port: 8082,
    },
  };
});
