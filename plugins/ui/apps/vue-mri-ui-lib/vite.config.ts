/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import basicSsl from '@vitejs/plugin-basic-ssl'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env files with VITE_ prefix (Vite's default behavior)
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isBuild = command === 'build'
  const isServe = command === 'serve'
  const isPreview = process.argv.includes('preview')

  // Parse navigation items for client routes (matching webpack config)
  const navigationItems = JSON.parse(env.VITE_NAVIGATION_ITEMS || '[]')
  const clientRoutes = navigationItems
    .map((item: { route?: string }) => item.route)
    .filter((route: string | undefined): route is string => !!route && route.startsWith('/'))
    .concat('/cohorts')

  if (!isProduction) {
    console.log('Mode       :', mode)
    console.log('Production :', isProduction)
    console.log('Build      :', isBuild)
    console.log('Client Routes:', clientRoutes)
    console.log('VITE_CLIENT_ID:', env.VITE_CLIENT_ID)
    console.log('VITE_REDIRECT_URL:', env.VITE_REDIRECT_URL)
  }

  return {
    // Base path for assets (empty string matches webpack publicPath: '')
    base: '',
    logLevel: 'info',

    plugins: [
      isBuild && cssInjectedByJsPlugin(),
      vue({
        template: {
          transformAssetUrls,
          compilerOptions: {
            // Custom element support for d4l web components (matching webpack config)
            isCustomElement: tag => tag.startsWith('d4l-'),
          },
        },
      }),
      vuetify({
        autoImport: true,
        styles: {
          configFile: 'src/styles/vuetify-settings.scss',
        },
      }),
      !isBuild &&
        basicSsl({
          name: 'vue-mri-ui-lib-localhost',
          domains: ['localhost'],
          certDir: './.devServer/cert',
        }),
      // Replace %VITE_*% placeholders in HTML with env values
      htmlEnvPlugin(env),
      // Generate assets.json only for serve/dev flow
      isServe && generateAssetsJsonPlugin(env.VITE_HOST || ''),
    ] as PluginOption[],

    // Expose VITE_ prefixed env variables to the client
    envPrefix: 'VITE_',

    define: {
      // Vue feature flags (matching webpack DefinePlugin)
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      // Process env replacements (lightweight alternative to vite-plugin-node-polyfills)
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VUE_APP_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      // Global process object shim for libraries that check process.env or process directly
      'process.env': JSON.stringify({}),
      // Some libraries check `process` directly (not just process.env)
      process: JSON.stringify({ env: { NODE_ENV: mode } }),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Dedupe Vue to prevent multiple instances (matching webpack alias)
        vue: path.resolve(__dirname, 'node_modules/vue'),
        // D3 v3 wrapper - provides access to window.d3 (loaded from public/vendor)
        d3: path.resolve(__dirname, './src/lib/d3.ts'),
      },
    },

    css: {
      postcss: {
        plugins: [
          // Remove deprecated `color-adjust` property from third-party CSS.
          // These files already include `print-color-adjust` alongside it, so removing is safe.
          {
            postcssPlugin: 'remove-color-adjust',
            Declaration: {
              'color-adjust': (decl) => { decl.remove() },
            },
          },
        ],
      },
      preprocessorOptions: {
        scss: {
          // Use modern-compiler API for better performance with sass
          api: 'modern-compiler',
          quietDeps: true,
          // Bootstrap scoping in style.scss requires nested @import which cannot use @use
          silenceDeprecations: ['import'],
        } as Record<string, unknown>,
      },
    },

    // Public directory for static assets (favicon, authenticate.js, system.min.js, etc.)
    publicDir: 'public',

    build: {
      outDir: isProduction ? path.resolve(__dirname, '../../resources/mri') : path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: !isProduction, // Disable source maps in production to reduce memory usage
      minify: isProduction,
      // Copy public folder contents to outDir
      copyPublicDir: true,
      ...(isBuild
        ? {
            lib: {
              entry: path.resolve(__dirname, 'src/lifecycles.ts'),
              fileName: () => 'lifecycles.js',
              formats: ['system'] as const,
            },
          }
        : {}),
      rollupOptions: {
        // import-map-overrides is provided by portal, don't bundle it
        external: ['import-map-overrides'],
        output: {
          // Map externals to global variables
          globals: {
            'import-map-overrides': 'importMapOverrides',
          },
          entryFileNames: isBuild ? 'lifecycles.js' : 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const name = assetInfo.names?.[0] || assetInfo.name || ''
            if (name.endsWith('.css')) {
              return 'css/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
        },
      },
    },

    server: {
      host: 'localhost',
      port: 8081,
      // Enable strict port - fail if port is already in use
      strictPort: true,
      // Enable HMR
      hmr: {
        overlay: true,
      },
      proxy: {
        // Proxy configuration (matching webpack devServer.proxy)
        '/': {
          target: env.VITE_STANDALONE_ATLAS === 'true' ? 'http://localhost:3131' : 'https://localhost:41100',
          changeOrigin: true,
          secure: false,
          ws: false, // Disable WS proxying so HMR works directly with Vite
          bypass: (req, _res, _options) => {
            const url = req.url || ''
            // Strip query string for path matching
            const path = url.split('?')[0] || ''

            // Serve Vite's client scripts directly
            if (url.startsWith('/@') || url.startsWith('/node_modules/') || url.startsWith('/src/')) {
              return url
            }

            // Let Vite handle index.html natively (don't route through proxy)
            if (path === '/' || path === '' || path === '/index.html') {
              return url
            }

            // Serve static assets from public folder
            if (
              url.endsWith('.ico') ||
              (url.endsWith('.js') && !url.includes('/d2e/') && !url.includes('/api/')) ||
              url.endsWith('.css') ||
              url.endsWith('.png') ||
              url.endsWith('.svg') ||
              (url.endsWith('.json') && url.startsWith('/assets'))
            ) {
              return url
            }

            // Return original URL for client routes to trigger SPA fallback
            if (clientRoutes.some((route: string) => path.startsWith(route))) {
              return url
            }

            // Let other requests pass through to proxy
            return null
          },
        },
      },
    },

    preview: {
      port: 8085,
      ...(isPreview ? { https: false as any } : {}),
    },

    optimizeDeps: {
      include: ['vue', 'vuex', 'single-spa', 'axios', 'lodash', 'echarts', 'vue-multiselect'],
    },

    // Vitest configuration
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/__tests__/*.test.ts'],
      coverage: {
        reporter: ['text', 'html', 'cobertura'],
        include: ['src/**/*.ts', 'src/**/*.vue'],
        exclude: ['src/**/*.d.ts', 'src/**/__tests__/*.ts'],
      },
    },
  }
})

/**
 * Plugin to replace %VITE_*% placeholders in HTML with environment variable values.
 * This is needed because AUTH_CONFIG must be set in a synchronous script (not a module)
 * before authenticate.js runs, and import.meta.env is only available in modules.
 */
function htmlEnvPlugin(env: Record<string, string>): PluginOption {
  return {
    name: 'html-env-plugin',
    transformIndexHtml(html) {
      // Replace all %VITE_*% placeholders with their env values
      return html.replace(/%VITE_([A-Z_]+)%/g, (_match, envName) => {
        const value = env[`VITE_${envName}`] || ''
        return value
      })
    },
  }
}

/**
 * Plugin to generate assets.json file during build
 * This replicates the HtmlWebpackPlugin behavior from the webpack config
 */
function generateAssetsJsonPlugin(hostUrl: string): PluginOption {
  return {
    name: 'generate-assets-json',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets: { js: string[]; css: string[] } = {
        js: [],
        css: [],
      }

      // Always include /d2e/mri/ prefix so assets resolve correctly when loaded from portal
      const basePath = hostUrl ? `${hostUrl}/d2e/mri/` : '/d2e/mri/'

      // Iterate over the bundle to find JS and CSS assets
      for (const [filename, file] of Object.entries(bundle)) {
        if (file.type === 'asset' && /\.css$/.test(filename)) {
          assets.css.push(`${basePath}${filename}`)
        } else if (file.type === 'chunk' && /\.js$/.test(filename)) {
          // For ES modules, only include entry points - dependencies are loaded via import
          // This prevents loading chunks that have side effects before DOM is ready
          if (file.isEntry) {
            assets.js.push(`${basePath}${filename}`)
          }
        }
      }

      // Emit assets.json file
      this.emitFile({
        type: 'asset',
        fileName: 'assets.json',
        source: JSON.stringify(assets, null, 2),
      })
    },
  }
}
