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

const installHana = String(process.env.INSTALL_SQLALCHEMY_HANA || "").toLowerCase() === "true";
const maxAttempts = 3;

function isHanaInstalled() {
  if (!fs.existsSync(hanaPkgJson)) return false;
  try {
    const installed = JSON.parse(fs.readFileSync(hanaPkgJson, "utf8"));
    return installed.version === hanaVersion;
  } catch {
    return false;
  }
}

function tryInstallHana() {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Installing ${hanaPkg}@${hanaVersion} (attempt ${attempt}/${maxAttempts})...`);
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
      console.warn(`npm spawn failed: ${result.error.message}`);
    } else if (result.status === 0) {
      return true;
    }
  }
  return false;
}

if (installHana) {
  if (isHanaInstalled()) {
    console.log(`${hanaPkg}@${hanaVersion} already installed.`);
  } else if (!tryInstallHana()) {
    console.warn(
      `WARNING: failed to install ${hanaPkg}@${hanaVersion} after ${maxAttempts} attempts. ` +
        `Continuing startup; HANA-backed requests will fail until the package is available.`,
    );
  }
} else {
  console.log(
    `INSTALL_SQLALCHEMY_HANA is not 'true'; skipping ${hanaPkg} install. ` +
      `Set INSTALL_SQLALCHEMY_HANA=true to enable.`,
  );
}

await import("./server.js");
