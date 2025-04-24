import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/jobs/', // comment out in dev mode
  plugins: [
    vue(),
    basicSsl({
      name: 'jobs-localhost',
      domains: ['localhost'],
      certDir: './.devServer/cert'
    }),
    {
      name: 'generate-assets-json',
      generateBundle(options, bundle) {
        const assets: { js: string[]; css: string[] } = {
          js: [],
          css: []
        }

        // Iterate over the bundle to find JS and CSS assets
        for (const [filename, file] of Object.entries(bundle)) {
          if (file.type === 'asset' && /\.css$/.test(filename)) {
            assets.css.push(filename)
          } else if (file.type === 'chunk' && /\.js$/.test(filename)) {
            assets.js.push(filename)
          }
        }

        // Path where the assets.json will be generated
        // const outputPath = path.join(options.dir || '.', 'assets.json')

        // Write assets object to assets.json
        this.emitFile({
          type: 'asset',
          fileName: 'assets.json',
          source: JSON.stringify(assets, null, 2)
        })

        // Alternatively, you can directly write to the file system
        // fs.writeFileSync(outputPath, JSON.stringify(assets, null, 2));
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../../resources/jobs'),
    sourcemap: true
  },
  server: {
    proxy: {
      '/portal/systemadmin/jobs/prefect': {
        target: 'https://localhost:41100',
        secure: false,
        rewrite: (path) => path.replace('/portal/systemadmin/jobs/prefect', '/prefect')
      }
    }
  }
})
