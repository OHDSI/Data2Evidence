/**
 * Pure helpers for the offline-asset prepare script. No I/O here so they can be
 * unit-tested with `node --test`.
 */

/**
 * Resolve the transitive closure of wheel file names for the given root
 * package names, using a Pyodide pyodide-lock.json object.
 * @returns {Set<string>} set of wheel file names
 */
export function resolveWheelClosure(lock, rootNames) {
  const files = new Set()
  const seen = new Set()
  const queue = [...rootNames]
  while (queue.length > 0) {
    const name = queue.shift()
    if (seen.has(name)) continue
    seen.add(name)
    const pkg = lock.packages[name]
    if (!pkg) {
      throw new Error(`Package not found in pyodide-lock.json: ${name}`)
    }
    files.add(pkg.file_name)
    for (const dep of pkg.depends || []) {
      if (!seen.has(dep)) queue.push(dep)
    }
  }
  return files
}

/**
 * Parse a Debian-control-style PACKAGES index into an array of
 * { name, version, deps, raw } records.
 */
export function parsePackagesIndex(text) {
  const records = []
  for (const block of text.split(/\n\s*\n/)) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const fields = {}
    let lastKey = null
    for (const line of trimmed.split('\n')) {
      const m = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/)
      if (m) {
        lastKey = m[1]
        fields[lastKey] = m[2]
      } else if (lastKey) {
        fields[lastKey] += ' ' + line.trim() // continuation line
      }
    }
    if (!fields.Package) continue
    const depFields = ['Depends', 'Imports', 'LinkingTo']
      .map((k) => fields[k] || '')
      .join(',')
    const deps = depFields
      .split(',')
      .map((d) => d.replace(/\(.*?\)/g, '').trim())
      .filter((d) => d && d !== 'R')
    records.push({
      name: fields.Package,
      version: fields.Version,
      deps,
      raw: trimmed,
    })
  }
  return records
}

/**
 * Build a PACKAGES index containing only the wanted packages plus the
 * transitive closure of their dependencies (restricted to records present in
 * the input). Records are separated by a blank line, as R expects.
 */
export function buildSubsetPackagesIndex(packagesText, wantedNames) {
  const records = parsePackagesIndex(packagesText)
  const byName = new Map(records.map((r) => [r.name, r]))
  const keep = new Set()
  const queue = [...wantedNames]
  while (queue.length > 0) {
    const name = queue.shift()
    if (keep.has(name)) continue
    const rec = byName.get(name)
    if (!rec) continue // dep not in this repo (e.g. base R package) — skip
    keep.add(name)
    for (const dep of rec.deps) {
      if (!keep.has(dep)) queue.push(dep)
    }
  }
  return (
    records
      .filter((r) => keep.has(r.name))
      .map((r) => r.raw)
      .join('\n\n') + '\n'
  )
}
