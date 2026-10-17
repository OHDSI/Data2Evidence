// Verifies the built artifact without executing it. Plain node cannot import
// dist/index.js: MUI's ESM pulls in peer packages a bundler resolves. These
// static checks catch the failures that actually matter — a missing export, or
// a peer dependency accidentally bundled in.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const js = path.join(root, "dist/index.js");
const css = path.join(root, "dist/index.css");
const types = path.join(root, "dist/types/index.d.ts");

const problems = [];

for (const f of [js, css, types]) {
  if (!existsSync(f))
    problems.push(`missing artifact: ${path.relative(root, f)}`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const bundle = readFileSync(js, "utf8");

const EXPECTED = [
  "D2eButton",
  "D2eDialog",
  "D2eIconButton",
  "D2eMenu",
  "D2eStatusChip",
  "D2eTextField",
  "D2eToolbar",
  "DIALOG_SIZE_MAP",
  "ICON_BUTTON_SIZE_MAP",
  "SIZE_MAP",
  "STATUS_CHIP_VARIANT_MAP",
  "VARIANT_MAP",
  "buildD2eMuiTheme",
  "tokens",
];
// Pull the names out of the final `export { ... }` block.
const exportBlock = bundle.match(/export\s*\{([\s\S]*?)\}/);
if (!exportBlock) {
  console.error("no export block found in dist/index.js");
  process.exit(1);
}
const exported = new Set(
  exportBlock[1]
    .split(",")
    .map((part) =>
      part
        .trim()
        .split(/\s+as\s+/)
        .pop(),
    )
    .filter(Boolean),
);
const missing = EXPECTED.filter((n) => !exported.has(n));
if (missing.length) problems.push(`missing exports: ${missing.join(", ")}`);

// react, react-dom, @mui/* and @emotion/* are peers; date-fns is a direct
// dependency resolved by the consumer's bundler. All must appear only as import
// specifiers, never bundled.
const PEER_PREFIXES = ["react", "react-dom", "@mui/", "@emotion/", "date-fns"];
const isPeer = (s) =>
  PEER_PREFIXES.some((p) => (p.endsWith("/") ? s.startsWith(p) : s === p || s.startsWith(`${p}/`)));

const specifiers = new Set(
  [...bundle.matchAll(/from ?"([^"]+)"/g)].map((m) => m[1]),
);
const unexpected = [...specifiers].filter((s) => !isPeer(s));
if (unexpected.length)
  problems.push(`unexpected runtime imports: ${unexpected.join(", ")}`);

// Positive assertions. Checking only for *unexpected* specifiers misses the
// case that matters: if a peer is bundled it stops appearing as an import at
// all, so its absence is the symptom.
if (![...specifiers].some((s) => s === "react" || s === "react/jsx-runtime"))
  problems.push("react is not imported — it may be bundled");
if (![...specifiers].some((s) => s.startsWith("@mui/")))
  problems.push("@mui is not imported — it may be bundled");

// Backstop: the library is small once the peers are external. Bundling MUI
// inflates it by an order of magnitude.
const MAX_BYTES = 150_000;
const size = readFileSync(js).length;
if (size > MAX_BYTES)
  problems.push(
    `dist/index.js is ${size} bytes (limit ${MAX_BYTES}) — a peer is probably bundled`,
  );

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `dist ok — ${EXPECTED.length} exports, peers external (${[...specifiers].join(", ")})`,
);
