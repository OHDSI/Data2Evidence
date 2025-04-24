const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const resourcesDir = path.resolve(__dirname, "../resources");

function runCommand(command, options = {}) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: "inherit", ...options });
  } catch (err) {
    console.error(`Error running command: ${command}`);
    process.exit(1);
  }
}

function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function buildStarboardNotebook() {
  console.log("Building Starboard Notebook...");
  const sourceDir = path.resolve(
    __dirname,
    "../node_modules/@data2evidence/d2e-starboard-notebook/packages/starboard-notebook/dist"
  );
  const destDir = path.join(resourcesDir, "starboard-notebook-base");
  createDir(destDir);

  runCommand(`cp -r ${sourceDir}/. ${destDir}`);
  console.log("Starboard Notebook build completed.");
}

async function buildPyodidePyqe() {
  console.log("Building PyodidePyqe...");
  const pyqeDir = path.resolve(__dirname, "../alp-libs/python/pyodidepyqe");
  const wheelDest = path.join(resourcesDir, "starboard-notebook-base");
  const venvDir = path.join(pyqeDir, "venv");

  console.log("Setting up a Python virtual environment...");
  process.chdir(pyqeDir);
  console.log(`Current directory: ${pyqeDir}`);

  if (!fs.existsSync(venvDir)) {
    runCommand("python3 -m venv venv");
  }

  const pythonBin = path.join(
    venvDir,
    process.platform === "win32" ? "Scripts/python" : "bin/python"
  );

  runCommand(`${pythonBin} -m pip install --upgrade pip setuptools wheel`);
  runCommand("brew install md5sha1sum");

  runCommand(`${pythonBin} setup.py sdist bdist_wheel`);
  const wheelFile = path.join(
    pyqeDir,
    "dist/pyodidepyqe-0.0.2-py3-none-any.whl"
  );
  if (fs.existsSync(wheelFile)) {
    runCommand(`cp ${wheelFile} ${wheelDest}`);
    console.log(`Copied ${wheelFile} to ${wheelDest}`);
  } else {
    console.error("Wheel file not found. Check the make package step.");
    process.exit(1);
  }
}

(async function main() {
  createDir(resourcesDir);
  await buildStarboardNotebook();
  await buildPyodidePyqe();
})();
