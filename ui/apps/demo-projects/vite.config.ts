import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  const isBuild = command === "build";

  return {
    mode,
    define: { "process.env.NODE_ENV": `"${mode}"` },
    plugins: [
      cssInjectedByJsPlugin(),
      react(),
      basicSsl({
        name: "demo-projects-localhost",
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
        ? path.resolve(__dirname, "../../resources/demo-projects")
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
      host: "0.0.0.0",
      port: 8202,
      cors: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 8202,
    },
  };
});
