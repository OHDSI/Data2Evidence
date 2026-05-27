// Loads d2e's pyodidepyqe (plugins/ui/alp-libs/python/pyodidepyqe/pyqe/**)
// as raw strings via Vite's import.meta.glob, then builds a Python snippet
// that, when executed inside Pyodide, wipes the vendored pyqe written by the
// submodule's worker (/home/pyodide/pyqe) and rewrites it with the d2e
// version. The submodule's worker statically globs ./pyqe/** from inside
// the submodule; we cannot replace that, so we override after init instead.

const pyqeFiles: Record<string, string> = import.meta.glob(
  '../../../../alp-libs/python/pyodidepyqe/pyqe/**/*.{py,yaml,yml,json,txt}',
  { query: '?raw', eager: true, import: 'default' }
) as Record<string, string>

const PYQE_ROOT_IN_PYODIDE = '/home/pyodide/pyqe'
const PYODIDE_PYQE_PREFIX = '/alp-libs/python/pyodidepyqe/'

// Strip the glob key back to the segment starting at "pyqe/..." so the
// layout inside Pyodide matches what `from pyqe import ...` expects.
function relPathInPyqe(globKey: string): string {
  const idx = globKey.indexOf(PYODIDE_PYQE_PREFIX)
  if (idx === -1) {
    throw new Error(
      'pyqeBootstrap: unexpected glob key (no "' +
        PYODIDE_PYQE_PREFIX +
        '" segment): ' +
        globKey
    )
  }
  return globKey.slice(idx + PYODIDE_PYQE_PREFIX.length)
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function buildPyqeBootstrapCode(): string {
  const entries: Array<[string, string]> = []
  for (const [key, source] of Object.entries(pyqeFiles)) {
    entries.push([relPathInPyqe(key), toBase64(source)])
  }
  if (entries.length === 0) {
    throw new Error(
      'pyqeBootstrap: no files matched the import.meta.glob. ' +
        'Check that plugins/ui/alp-libs/python/pyodidepyqe/pyqe/ exists ' +
        'and is readable by Vite (server.fs.allow).'
    )
  }
  const mapLines = entries.map(
    ([rel, b64]) => '    ' + JSON.stringify(rel) + ': ' + JSON.stringify(b64) + ','
  )

  const lines: string[] = [
    'import base64, os, shutil, sys',
    '',
    'shutil.rmtree(' + JSON.stringify(PYQE_ROOT_IN_PYODIDE) + ', ignore_errors=True)',
    '',
    "for _name in [m for m in list(sys.modules) if m == 'pyqe' or m.startswith('pyqe.')]:",
    '    del sys.modules[_name]',
    '',
    '_pyqe_files = {',
    ...mapLines,
    '}',
    'for _rel, _b64 in _pyqe_files.items():',
    "    _fs_path = '/home/pyodide/' + _rel",
    '    os.makedirs(os.path.dirname(_fs_path), exist_ok=True)',
    "    with open(_fs_path, 'wb') as _fh:",
    '        _fh.write(base64.b64decode(_b64))',
    '',
    "if '/home/pyodide' not in sys.path:",
    "    sys.path.insert(0, '/home/pyodide')",
    '',
    '# Pre-warm: force-install ssl (transitively needed by requests, but not',
    "# pre-installed by the worker), then eager-import pyqe. If 'import ssl'",
    '# raises ModuleNotFoundError the worker retries this whole bootstrap;',
    "# the sys.modules['pyqe*'] purge + file rewrite above are idempotent,",
    "# so retries don't leave partial pyqe state. By the time the user's",
    "# first cell runs, pyqe is fully imported and 'from pyqe import *' is",
    '# a cache hit.',
    'import ssl  # noqa: F401',
    'import pyqe  # noqa: F401',
  ]
  return lines.join('\n')
}
