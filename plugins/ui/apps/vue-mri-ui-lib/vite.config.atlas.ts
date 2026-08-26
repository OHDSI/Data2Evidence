import { defineConfig } from 'vite'
import path from 'path'

// Atlas3-shell wrapper: a tiny dependency-free SystemJS single-spa parcel served
// at /atlas/plugins/patient-analytics/index.system.js. It only creates an iframe
// hosting the full PA app (built by vite.config.atlas-app.ts into dist-atlas/app)
// and relays the auth/dataset context to it via postMessage.
export default defineConfig({
  publicDir: false,

  resolve: {
    alias: {
      // Source-export the local d2e component library rather than resolving the
      // unpublished @d2e/ui package from the registry. Keep the tokens.css
      // subpath ahead of the bare package prefix.
      '@d2e/ui/tokens.css': path.resolve(__dirname, '../../libs/d2e-ui/src/tokens/tokens.css'),
      '@d2e/ui': path.resolve(__dirname, '../../libs/d2e-ui/src/index.ts'),
    },
  },

  build: {
    outDir: path.resolve(__dirname, 'dist-atlas'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    lib: {
      entry: path.resolve(__dirname, 'src/atlas-iframe-parcel.ts'),
      fileName: () => 'index.system.js',
      formats: ['system'] as const,
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.system.js',
      },
    },
  },
})
