/**
 * Build-time preparation of offline notebook-kernel assets.
 *
 * Populates <publicDir>/kernel-assets/ with:
 *   pyodide/    — pyodide core + bootstrap wheels + patched pyodide-lock.json
 *   webr/       — full WebR WASM binaries (copied from the npm package)
 *   webr-repo/  — minimal CRAN-style repo for the WebR bootstrap packages
 *
 * Requires internet at BUILD time; the resulting bundle runs fully offline.
 */
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveWheelClosure,
  buildSubsetPackagesIndex,
  parsePackagesIndex,
} from './offline-assets-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const UI_DIR = path.resolve(APP_DIR, '../..')

const PYODIDE_PKG = path.join(UI_DIR, 'node_modules/pyodide')
const WEBR_PKG = path.join(UI_DIR, 'node_modules/webr')

// Bootstrap packages that ARE in the pyodide distribution lock. Their full
// dependency closure is resolved from the lock's `depends` graph and mirrored.
//   - pyqe imports pandas (→ numpy, python-dateutil, pytz) and, via its azure
//     auth path, msal (→ cryptography → cffi, pycparser).
//   - `ssl` (→ libopenssl) is imported at runtime by requests/urllib3 but is
//     NOT listed in their `depends`; Pyodide auto-loads it via the
//     module→package map, so it must be pre-staged or `import requests` 404s.
const PYODIDE_LOCK_ROOTS = [
  'micropip',
  'requests',
  'pyyaml',
  'six',
  'ssl',
  'pandas',
  'cryptography', // required by msal
]
// Bootstrap packages NOT in the lock — fetched from PyPI and injected into the
// local lock. `depends` lists deps that must resolve from the mirror so the
// runtime can auto-load them (all listed deps are themselves mirrored above).
const PYODIDE_PYPI_EXTRAS = [
  { name: 'PyJWT' },
  { name: 'python-dotenv' },
  { name: 'msal', depends: ['cryptography', 'requests', 'PyJWT'] },
]
// WebR bootstrap packages (deps resolved from the repo PACKAGES index).
const WEBR_PACKAGES = ['checkmate', 'jsonlite', 'dplyr']
// R minor version bundled in the webr npm pkg (4.5.1 in webr 0.5.9).
// Must match the contrib dir WebR requests at runtime. Bump on webr upgrade.
const R_CONTRIB_VERSION = '4.5'

const PYODIDE_CORE_FILES = [
  'pyodide.asm.wasm',
  'pyodide.asm.js',
  'python_stdlib.zip',
  'pyodide-lock.json',
]

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function preparePyodide(outDir) {
  const dest = path.join(outDir, 'pyodide')
  await mkdir(dest, { recursive: true })

  // 1. Copy core files from the npm package.
  for (const f of PYODIDE_CORE_FILES) {
    await cp(path.join(PYODIDE_PKG, f), path.join(dest, f))
  }

  // 2. Resolve the pyodide version + lock; download in-distribution wheels.
  const version = JSON.parse(
    await readFile(path.join(PYODIDE_PKG, 'package.json'), 'utf-8')
  ).version
  const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
  const lock = JSON.parse(await readFile(path.join(dest, 'pyodide-lock.json'), 'utf-8'))
  const wheels = resolveWheelClosure(lock, PYODIDE_LOCK_ROOTS)
  for (const file of wheels) {
    const target = path.join(dest, file)
    if (await exists(target)) continue
    await writeFile(target, await download(cdn + file))
    console.log(`  pyodide wheel: ${file}`)
  }

  // 3. Download the PyPI extras, place them in the index, and inject lock entries.
  for (const { name, depends = [] } of PYODIDE_PYPI_EXTRAS) {
    const metaRes = await fetch(`https://pypi.org/pypi/${name}/json`)
    if (!metaRes.ok) {
      throw new Error(`PyPI metadata fetch failed (${metaRes.status}): ${name}`)
    }
    const meta = await metaRes.json()
    const wheel = meta.urls.find(
      (u) => u.packagetype === 'bdist_wheel' && u.filename.endsWith('-none-any.whl')
    )
    if (!wheel) throw new Error(`No py3-none-any wheel found on PyPI for ${name}`)
    const buf = await download(wheel.url)
    await writeFile(path.join(dest, wheel.filename), buf)
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const key = name.toLowerCase()
    lock.packages[key] = {
      name: key,
      version: meta.info.version,
      file_name: wheel.filename,
      install_dir: 'site',
      sha256,
      package_type: 'package',
      imports: [],
      depends: depends.map((d) => d.toLowerCase()),
      unvendored_tests: false,
    }
    console.log(`  pyodide extra (PyPI): ${wheel.filename}`)
  }
  await writeFile(
    path.join(dest, 'pyodide-lock.json'),
    JSON.stringify(lock)
  )
}

async function prepareWebr(outDir) {
  // 1. Copy the full WASM runtime from the npm package.
  const webrDest = path.join(outDir, 'webr')
  if (!(await exists(webrDest))) {
    await cp(path.join(WEBR_PKG, 'dist'), webrDest, { recursive: true })
  }

  // 2. Build the minimal package repo.
  const contribDir = path.join(
    outDir,
    'webr-repo/bin/emscripten/contrib',
    R_CONTRIB_VERSION
  )
  await mkdir(contribDir, { recursive: true })
  const repoBase = `https://repo.r-wasm.org/bin/emscripten/contrib/${R_CONTRIB_VERSION}/`
  const packagesText = (await download(repoBase + 'PACKAGES')).toString('utf-8')

  // Determine versions/filenames + dep closure, then download each .tgz.
  const subset = buildSubsetPackagesIndex(packagesText, WEBR_PACKAGES)
  for (const rec of parsePackagesIndex(subset)) {
    const file = `${rec.name}_${rec.version}.tgz`
    const target = path.join(contribDir, file)
    if (await exists(target)) continue
    await writeFile(target, await download(repoBase + file))
    console.log(`  webr package: ${file}`)
  }

  // 3. Write the filtered PACKAGES + PACKAGES.gz the WebR client reads.
  await writeFile(path.join(contribDir, 'PACKAGES'), subset)
  await writeFile(path.join(contribDir, 'PACKAGES.gz'), gzipSync(Buffer.from(subset)))
}

export async function prepareOfflineAssets({ publicDir }) {
  const outDir = path.join(publicDir, 'kernel-assets')
  await mkdir(outDir, { recursive: true })
  console.log('Preparing offline notebook kernel assets…')
  await preparePyodide(outDir)
  await prepareWebr(outDir)
  console.log('Offline kernel assets ready at', outDir)
}

// Allow running directly: `node scripts/prepare-offline-assets.mjs`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const force = process.argv.includes('--force')
  const publicDir = path.join(APP_DIR, 'public')
  if (force) {
    await rm(path.join(publicDir, 'kernel-assets'), { recursive: true, force: true })
  }
  await prepareOfflineAssets({ publicDir })
}
