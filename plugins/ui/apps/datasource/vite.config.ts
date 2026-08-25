import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

// This plugin targets Atlas3 (not d2e's own portal), so unlike sibling apps
// under plugins/ui/apps it does not externalize import-map-overrides —
// Atlas3's SystemJS host only shims vue/vue-router/vuetify/single-spa-vue
// (see Atlas3/public/plugin-runtime.js), and this plugin bundles its own
// copies of those, matching Atlas3/plugins-dev/hello-world-plugin.
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    build: {
      outDir: isProduction ? path.resolve(__dirname, '../../resources/datasource') : path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/main.ts'),
        formats: ['system'],
        fileName: 'index',
      },
      rollupOptions: {
        external: [],
        output: {
          format: 'system',
          // Atlas3's parcelLoader derives the CSS URL from the JS entry
          // filename by replacing the .js suffix with `style.css` — see
          // Atlas3/src/plugins/host/parcelLoader.ts::injectPluginStylesheet.
          assetFileNames: 'style[extname]',
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  }
})
