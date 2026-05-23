import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const { name: hanaPkg, version: hanaVersion } = pkg.hanaClient;
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hanaPkgJson = path.join(appDir, "node_modules", hanaPkg, "package.json");

function isHanaInstalled() {
  if (!fs.existsSync(hanaPkgJson)) return false;
  try {
    const installed = JSON.parse(fs.readFileSync(hanaPkgJson, "utf8"));
    return installed.version === hanaVersion;
  } catch {
    return false;
  }
}

if (!isHanaInstalled()) {
  console.log(`Installing ${hanaPkg}@${hanaVersion} (not bundled in image for license reasons)...`);
  const result = spawnSync(
    "npm",
    [
      "install",
      "--no-save",
      "--no-package-lock",
      "--no-audit",
      "--no-fund",
      "--omit=dev",
      `${hanaPkg}@${hanaVersion}`,
    ],
    { cwd: appDir, stdio: "inherit" },
  );
  if (result.error) {
    console.error(`Failed to spawn npm: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Failed to install ${hanaPkg}@${hanaVersion}`);
    process.exit(result.status || 1);
  }
} else {
  console.log(`${hanaPkg}@${hanaVersion} already installed.`);
}

await import("./server.js");
