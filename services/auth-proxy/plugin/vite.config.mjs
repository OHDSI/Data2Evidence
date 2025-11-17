import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: './src/main.ts',
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
    outDir: '../static/plugins/cohorts',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
