import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "../docker-compose.yml"), "utf8");
writeFileSync(
  join(__dirname, "docker-compose-embed.ts"),
  `export const dockerComposeContent = ${JSON.stringify(content)};\n`
);

const SCRIPT_MAP = {
  "setupdemo.mjs":                { fn: "setupDemo" },
  "check-setupdemo-flow.mjs":     { fn: "checkSetupDemoFlow" },
  "setuphttptestenv.mjs":         { fn: "setupHTTPTestEnv" },
  "setupdemohana.mjs":            { fn: "setupDemoHana" },
  "check-setupdemohana-flow.mjs": { fn: "checkSetupDemoHanaFlow" },
  "syncroles.mjs":                { fn: "syncRoles" },
};

const ARGV_BLOCK =
`const args = process.argv.slice(2);
const vIndex_envfile = args.indexOf("-n");
let envfile;
if (vIndex_envfile !== -1 && !args[vIndex_envfile + 1].startsWith("-")) {
  envfile = args[vIndex_envfile + 1];
} else {
  envfile = ".env";
}`;

const distDir = join(__dirname, "dist");
mkdirSync(distDir, { recursive: true });

const generatedPaths = [];

for (const [filename, { fn }] of Object.entries(SCRIPT_MAP)) {
  const src = readFileSync(join(__dirname, filename), "utf8");

  if (!src.includes(ARGV_BLOCK)) {
    console.error(`embed-assets: could not find argv block in ${filename} — skipping`);
    continue;
  }

  let code = src
    .replace(/^#!.*\n/, "")                                          // remove shebang
    .replace(ARGV_BLOCK, `export async function ${fn}(envfile = ".env") {`) // replace entry point
    .replace(/process\.exit\(1\)/g, "throw new Error('exit 1')")    // propagate errors
    .trimEnd() + "\n}\n";

  code = `// @ts-nocheck\n// Auto-generated from ${filename} — do not edit directly.\n${code}`;

  const outPath = join(distDir, filename.replace(".mjs", ".ts"));
  writeFileSync(outPath, code);
  generatedPaths.push(outPath);
  console.log(`Generated ${outPath}`);
}

if (generatedPaths.length > 0) {
  const tscBin = resolve(__dirname, "../node_modules/.bin/tsc");
  execFileSync(tscBin, [
    "--module", "commonjs",
    "--esModuleInterop", "true",
    "--skipLibCheck",
    "--target", "es2019",
    "--declaration",
    "--sourceMap",
    "--outDir", distDir,
    "--rootDir", distDir,
    ...generatedPaths,
  ], { stdio: "inherit" });

  for (const p of generatedPaths) {
    unlinkSync(p);
  }
}
