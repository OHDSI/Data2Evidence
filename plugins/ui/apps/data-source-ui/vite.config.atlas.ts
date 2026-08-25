import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: 'data-source-ui',
      fileName: () => 'index.system.js',
      formats: ['system'] as const,
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'vuetify', 'single-spa'],
      output: {
        format: 'system',
        entryFileNames: 'index.system.js',
        globals: {
          vue: 'vue',
          'vue-router': 'vue-router',
          vuetify: 'vuetify',
          'single-spa': 'single-spa',
        },
      },
    },
  },
})
