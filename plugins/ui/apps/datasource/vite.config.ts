import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'

// vue is externalized (Atlas3's host shims it); CSS stays JS-injected rather
// than split into style.css, which 404s on parcel mounts when absent.
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [vue(), vuetify({ autoImport: true }), cssInjectedByJsPlugin()],
    build: {
      outDir: isProduction ? path.resolve(__dirname, '../../resources/datasource') : path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/main.ts'),
        formats: ['system'],
        fileName: 'index',
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          format: 'system',
          globals: { vue: 'vue' },
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  }
})
