import path from "path";
import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  const isBuild = command === "build";
  const entryFile = isBuild ? "module.ts" : "index.tsx";

  console.log("Production :", isProduction);
  console.log("Build      :", isBuild);
  console.log("Entry      :", entryFile);

  return {
    mode,
    define: { "process.env.NODE_ENV": `"${mode}"` },
    plugins: [
      cssInjectedByJsPlugin(),
      react(),
      basicSsl({
        name: "concept-mapping-localhost",
        domains: ["localhost"],
        certDir: "./.devServer/cert",
      }) as PluginOption,
    ],
    optimizeDeps: {
      include: ["@portal/plugin", "@portal/components"],
    },
    build: {
      commonjsOptions: {
        include: [/plugin/, /node_modules/],
      },
      outDir: isProduction
        ? path.resolve(__dirname, "../../resources/concept-mapping")
        : path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      minify: isProduction,
      lib: {
        entry: path.resolve(__dirname, "src/module.ts"),
        name: "concept-mapping",
        fileName: entryFile,
        formats: ["umd"],
      },
      rollupOptions: {
        treeshake: true,
        ...(isBuild && isProduction
          ? {
              external: ["react", "react-dom"],
              output: {
                globals: {
                  react: "React",
                  "react-dom": "ReactDom",
                },
                entryFileNames: `module.js`,
                format: "umd",
              },
            }
          : {}),
      },
    },
    server: {
      proxy: {
        "/system-portal": {
          target: "https://localhost:41100",
          secure: false,
        },
        "/resources/concept-mapping": {
          target: "https://localhost:41100",
          secure: false,
        },
        "/terminology": {
          target: "https://localhost:41100",
          secure: false,
        },
      },
    },
  };
});
