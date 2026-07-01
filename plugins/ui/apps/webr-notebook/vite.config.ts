import tailwindcss from '@tailwindcss/vite'
import basicSsl from "@vitejs/plugin-basic-ssl"
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { prepareOfflineAssets } from './scripts/prepare-offline-assets.mjs'

// Read .R source files at build time and inject via define.
// Vite's ?raw uses JS template literals which mangle R escape sequences
// (\n, \\, \t). JSON.stringify produces properly escaped double-quoted strings.
const rD2ESource = readFileSync(
  path.resolve(__dirname, './src/kernels/rD2E.R'),
  'utf-8'
)

// Read the resolved pyodide npm version. The submodule's pyodide-worker.ts
// hardcodes a CDN indexURL pinned to v0.29.0 by default. If the npm package
// resolves to anything else (currently 0.29.3), loadPyodide rejects with
// "Pyodide version does not match". Inject the resolved version here and pass
// it through as indexUrl from NotebookManager so the two cannot drift.
const pyodideVersion: string = JSON.parse(
  readFileSync(
    path.resolve(__dirname, '../../node_modules/pyodide/package.json'),
    'utf-8'
  )
).version

/**
 * Post-build plugin that patches the entry chunk on disk:
 * 1. Prepends a `process` polyfill (some deps reference process.env.NODE_ENV)
 * 2. Fixes SystemJS lifecycle exports for single-spa
 *
 * Uses writeBundle (runs after all generateBundle hooks, including
 * vite-plugin-css-injected-by-js which has enforce:'post') so our
 * changes are guaranteed to be the final state of the files.
 */
function postBuildPatchPlugin(): Plugin {
  const processPolyfill =
    'if(typeof process==="undefined"){globalThis.process={env:{NODE_ENV:"production"},nextTick:function(cb){setTimeout(cb,0)},emit:function(){}};};\n'
  let resolvedOutDir = ''
  return {
    name: 'post-build-patch',
    enforce: 'post',
    configResolved(config) {
      resolvedOutDir = path.resolve(config.root, config.build.outDir)
    },
    writeBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue

        const filePath = path.resolve(resolvedOutDir, fileName)
        let code = readFileSync(filePath, 'utf-8')

        // 1. Prepend process polyfill
        code = processPolyfill + code

        // 2. Fix SystemJS lifecycle exports
        const exportFnMatch = code.match(
          /System\.register\(\[.*?\],\(function\((\w+),/
        )
        if (exportFnMatch) {
          const exportFn = exportFnMatch[1]
          const match = code.match(
            /(\w+)\.bootstrap,\1\.mount,\1\.unmount\}\)\}\}\)\);\s*$/
          )
          if (match) {
            const v = match[1]
            code = code.replace(
              new RegExp(
                `${v}\\.bootstrap,${v}\\.mount,${v}\\.unmount\\}\\)\\}\\}\\)\\);\\s*$`
              ),
              `${exportFn}("bootstrap",${v}.bootstrap),${exportFn}("mount",${v}.mount),${exportFn}("unmount",${v}.unmount)})}}));\n`
            )
          }
        }

        writeFileSync(filePath, code)
      }
    },
  }
}

/**
 * Build-only plugin: fetch/copy the offline kernel runtimes into publicDir so
 * Vite copies them into the build output. Skipped in dev (apply: 'build').
 */
function offlineAssetsPlugin(): Plugin {
  return {
    name: 'offline-kernel-assets',
    apply: 'build',
    async buildStart() {
      await prepareOfflineAssets({ publicDir: path.resolve(__dirname, 'public') })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
      react(),
      tailwindcss(),
      cssInjectedByJsPlugin(),
      postBuildPatchPlugin(),
      offlineAssetsPlugin(),
      basicSsl({
        name: "notebook-localhost",
        domains: ["localhost"],
        certDir: "./.devServer/cert",
      })
      ],
      
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../node_modules/@trex/notebook/src'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/search',
      '@codemirror/autocomplete',
      '@codemirror/lint',
      '@lezer/common',
      '@lezer/highlight',
      '@lezer/lr',
    ],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 8084,
    cors: true,
    headers: {
      // Required for WebR SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Access-Control-Expose-Headers':'Content-Encoding'
    },
  },
  define: {
    __RD2E_SOURCE__: JSON.stringify(rD2ESource),
    __PYODIDE_VERSION__: JSON.stringify(pyodideVersion),
    // Production build: load kernel assets from the app's own origin (offline).
    // Dev server: empty → kernels fall back to public CDNs.
    __KERNEL_ASSET_BASE__: JSON.stringify(
      command === 'build' ? '/resources/notebook/kernel-assets' : ''
    ),
  },
  base: './',
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'src/lifecycles.tsx'),
      external: [],
      output: {
        format: 'system',
        entryFileNames: 'lifecycles.js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    outDir: path.resolve(__dirname, '../../resources/notebook'),
    emptyOutDir: true,
  },
}))
