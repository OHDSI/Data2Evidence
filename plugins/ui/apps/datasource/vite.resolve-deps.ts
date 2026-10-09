import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'path'

const require = createRequire(path.join(__dirname, 'vite.resolve-deps.ts'))

/**
 * Resolve a package's directory wherever it actually installed.
 *
 * vuetify is hoisted to plugins/ui/node_modules by the bun workspace install
 * (local + most CI), but lands app-locally under the isolated atlas build
 * (`npm install --workspaces=false`). The @d2e/ui components are bundled from
 * source (see the vite alias) and import `vuetify/components` with a bare
 * specifier; resolving that from libs/d2e-ui fails in the isolated build unless
 * we point it at the copy that is actually present. Mirrors vue-mri-ui-lib.
 */
function packageDir(name: string): string {
  try {
    return path.dirname(require.resolve(`${name}/package.json`))
  } catch {
    const appLocal = path.resolve(__dirname, 'node_modules', name)
    if (existsSync(appLocal)) return appLocal
    throw new Error(
      `vite.resolve-deps: cannot resolve "${name}" from ${__dirname}. ` +
        'Run the workspace install (bun install in plugins/ui) first.',
    )
  }
}

export const vuetifyDir = packageDir('vuetify')
