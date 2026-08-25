import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tokens } from "../src/tokens/tokens";

const BANNER = [
  "/* GENERATED — DO NOT EDIT.",
  " * Source: src/tokens/tokens.ts. Run `npm run tokens:build` to regenerate. */",
].join("\n");

function kebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectEntries(
  prefix: string,
  value: unknown,
  out: Array<[string, string]>
): void {
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectEntries(`${prefix}-${kebabCase(key)}`, child, out);
    }
    return;
  }
  if (typeof value === "number") {
    out.push([`--${prefix}`, `${value}px`]);
    return;
  }
  out.push([`--${prefix}`, String(value)]);
}

export function generateTokensCss(): string {
  const entries: Array<[string, string]> = [];
  for (const [group, value] of Object.entries(tokens)) {
    collectEntries(`d2e-${kebabCase(group)}`, value, entries);
  }
  return [
    BANNER,
    ":root, .v-theme--d2e {",
    ...entries.map(([name, value]) => `  ${name}: ${value};`),
    "}",
    "",
  ].join("\n");
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedDirectly =
  process.argv[1] != null &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const outPath = resolve(dirname(scriptPath), "../src/tokens/tokens.css");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, generateTokensCss());
}
