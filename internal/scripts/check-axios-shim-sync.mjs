#!/usr/bin/env node
// The fetch-based axios shim is duplicated across the plugin functions, one copy
// per function, because each function is packaged independently and there is no
// shared module they all already import. Nothing in the toolchain keeps the
// copies in sync, so a fix applied to one silently leaves the other twelve
// broken — which is how the header/arraybuffer defects would have been missed.
//
// This check fails when the copies diverge. Run with --fix to overwrite every
// copy from the canonical one.
//
//   node internal/scripts/check-axios-shim-sync.mjs
//   node internal/scripts/check-axios-shim-sync.mjs --fix
//
// Once the functions share a real module, delete this script and the note at the
// top of _axios.ts.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const searchRoot = join(repoRoot, "plugins/functions");
const CANONICAL = join(searchRoot, "alp-usermgmt/src/api/_axios.ts");

function findShims(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findShims(full, found);
    else if (entry === "_axios.ts") found.push(full);
  }
  return found;
}

const shims = findShims(searchRoot).sort();
if (!shims.includes(CANONICAL)) {
  console.error(`canonical shim not found at ${relative(repoRoot, CANONICAL)}`);
  process.exit(2);
}

const canonical = readFileSync(CANONICAL, "utf8");
const fix = process.argv.includes("--fix");
const drifted = shims.filter((f) => f !== CANONICAL && readFileSync(f, "utf8") !== canonical);

if (drifted.length === 0) {
  console.log(`_axios.ts: ${shims.length} copies, all identical`);
  process.exit(0);
}

if (fix) {
  for (const f of drifted) {
    writeFileSync(f, canonical);
    console.log(`synced ${relative(repoRoot, f)}`);
  }
  process.exit(0);
}

console.error(`_axios.ts copies have drifted from ${relative(repoRoot, CANONICAL)}:`);
for (const f of drifted) console.error(`  ${relative(repoRoot, f)}`);
console.error("\nRun: node internal/scripts/check-axios-shim-sync.mjs --fix");
process.exit(1);
