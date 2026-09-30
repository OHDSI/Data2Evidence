// Knex seeds and migrations are dynamically `import()`ed from disk at runtime
// (see ../src/db/SeedSource.ts and ../src/db/MigrationSource.ts), not bundled
// with the rest of the function. Only this function's own directory is
// staged onto disk at build/deploy time, so a file under src/db/seeds or
// src/db/migrations that imports a bare `@alp/...` specifier, or a relative
// path that climbs above the function root, will fail to resolve at runtime
// even though `deno check`/bundling never notices. This test statically
// scans those two directories for that hazard so it cannot come back.
import { assertEquals } from "jsr:@std/assert@^1.0.6"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET_DIRS = ["src/db/seeds", "src/db/migrations"]

function collectTsFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of Deno.readDirSync(dir)) {
    const full = join(dir, entry.name)
    if (entry.isDirectory) {
      files.push(...collectTsFiles(full))
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      files.push(full)
    }
  }
  return files
}

function importSpecifiers(text: string): string[] {
  const specifiers: string[] = []
  const fromRe = /\bfrom\s+["']([^"']+)["']/g
  const dynamicImportRe = /\bimport\(\s*["']([^"']+)["']\s*\)/g
  let match: RegExpExecArray | null
  while ((match = fromRe.exec(text))) specifiers.push(match[1])
  while ((match = dynamicImportRe.exec(text))) specifiers.push(match[1])
  return specifiers
}

Deno.test("seed and migration files only import from inside their own function directory", () => {
  const offenders: string[] = []

  for (const target of TARGET_DIRS) {
    const dir = join(PACKAGE_ROOT, target)
    let files: string[]
    try {
      files = collectTsFiles(dir)
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) continue
      throw err
    }

    for (const file of files) {
      const relFile = relative(PACKAGE_ROOT, file)
      const text = Deno.readTextFileSync(file)

      for (const specifier of importSpecifiers(text)) {
        if (specifier.startsWith("@alp/")) {
          offenders.push(
            `${relFile}: bare specifier "${specifier}" escapes the function directory ` +
              `(dynamically loaded seeds/migrations can only import from inside their own function's staged directory)`,
          )
          continue
        }

        if (specifier.startsWith(".")) {
          const resolved = resolve(dirname(file), specifier)
          const relToRoot = relative(PACKAGE_ROOT, resolved)
          if (relToRoot.startsWith("..")) {
            offenders.push(
              `${relFile}: relative import "${specifier}" climbs above the function root`,
            )
          }
        }
      }
    }
  }

  assertEquals(offenders, [], offenders.join("\n"))
})
