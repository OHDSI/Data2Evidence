import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Builds the distributable artifact. React, ReactDOM, MUI and emotion are peer
// dependencies and must never be bundled.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@mui\//,
        /^@emotion\//,
        /^date-fns\/?/,
        "react-simplemde-editor",
        /^easymde\/?/,
      ],
    },
    cssCodeSplit: false,
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
