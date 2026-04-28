import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Vite config for building the portal plugin wrapper.
 * This builds the single-spa lifecycle that embeds Atlas3 in an iframe.
 */
export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: './src/portal-main.ts',
      formats: ['system'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'single-spa-vue'],
      output: {
        format: 'system',
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          'single-spa-vue': 'singleSpaVue',
        },
      },
    },
    outDir: './resources/portal',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
