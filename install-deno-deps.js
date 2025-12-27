#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function printHelp() {
  console.log('Install Deno Dependencies\n');
  console.log('Usage: ./install-deno-deps.js <functions-dir>\n');
  console.log('Scans for folders with deno.json and runs "deno install --allow-scripts".');
}

if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.length === 2) {
  printHelp();
  process.exit(0);
}

const FUNCTIONS_DIR = process.argv[2];

function needsLockRegeneration(folderPath) {
  const denoJsonPath = path.join(folderPath, 'deno.json');
  const denoLockPath = path.join(folderPath, 'deno.lock');

  if (!fs.existsSync(denoLockPath)) {
    return { needsRegen: true, reason: 'no lock file' };
  }

  try {
    const denoJson = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    const denoLock = JSON.parse(fs.readFileSync(denoLockPath, 'utf8'));

    const imports = denoJson.imports || {};
    const jsrImports = Object.entries(imports)
      .filter(([_, value]) => typeof value === 'string' && value.startsWith('jsr:'))
      .map(([key, value]) => ({ key, value }));

    if (jsrImports.length === 0) {
      return { needsRegen: false };
    }

    const specifiers = denoLock.specifiers || {};
    const jsrSection = denoLock.jsr || {};

    for (const { key, value } of jsrImports) {
      const match = value.match(/^jsr:(@[^@/]+\/[^@/]+)/);
      if (match) {
        const pkgName = match[1];
        const hasSpecifier = Object.keys(specifiers).some(s => s.includes(pkgName));
        const hasJsrEntry = Object.keys(jsrSection).some(s => s.includes(pkgName));

        if (!hasSpecifier || !hasJsrEntry) {
          return {
            needsRegen: true,
            reason: `missing JSR specifier/integrity for ${pkgName}`
          };
        }
      }
    }

    return { needsRegen: false };
  } catch (error) {
    return { needsRegen: true, reason: `error parsing files: ${error.message}` };
  }
}

function installDependencies(folderPath, errorSummary) {
  const folderName = path.basename(folderPath);
  const denoJsonPath = path.join(folderPath, 'deno.json');

  if (!fs.existsSync(denoJsonPath)) {
    console.log(`⚠️  No deno.json found in ${folderName}`);
    errorSummary.noDenoJson.push(folderName);
    return false;
  }

  const { needsRegen, reason } = needsLockRegeneration(folderPath);
  if (needsRegen) {
    console.log(`🔄 Regenerating lock file for ${folderName} (${reason})`);
    const nodeModulesPath = path.join(folderPath, 'node_modules');
    const denoLockPath = path.join(folderPath, 'deno.lock');

    if (fs.existsSync(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    }
    if (fs.existsSync(denoLockPath)) {
      fs.unlinkSync(denoLockPath);
    }
  }

  try {
    console.log(`🔧 Installing dependencies for ${folderName}...`);

    const result = execSync('deno install --allow-scripts', {
      cwd: folderPath,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    console.log(`✅ Dependencies installed for ${folderName}`);

    if (result.trim()) {
      const lines = result.trim().split('\n');
      const meaningfulLines = lines.filter(line =>
        line.trim() &&
        !line.includes('Download') &&
        !line.includes('Check')
      );

      if (meaningfulLines.length > 0) {
        console.log(`   ℹ️  ${meaningfulLines.join(', ')}`);
      }
    }

    errorSummary.success.push(folderName);
    return true;

  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${folderName}`);

    let errorMessage = error.message;
    if (error.stderr) {
      errorMessage = error.stderr.toString().trim() || error.message;
    }

    const errorLines = errorMessage.split('\n');
    const mainError = errorLines.find(line =>
      line.includes('error:') ||
      line.includes('Error:') ||
      line.includes('Failed')
    ) || errorLines[0];

    console.error(`   💥 ${mainError}`);

    errorSummary.installFailed.push({
      folder: folderName,
      error: mainError
    });
    return false;
  }
}

function main() {
  if (!FUNCTIONS_DIR) {
    console.error('❌ Functions directory argument is required.');
    console.error('Usage: ./install-deno-deps.js <functions-dir>');
    process.exit(1);
  }

  console.log(`🔧 Installing Deno dependencies for all folders with deno.json in: ${FUNCTIONS_DIR}\n`);

  const errorSummary = {
    success: [],
    noDenoJson: [],
    installFailed: []
  };

  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !name.startsWith('_'));

  const foldersWithDenoJson = folders.filter(folderName => {
    const folderPath = path.join(FUNCTIONS_DIR, folderName);
    const denoJsonPath = path.join(folderPath, 'deno.json');
    return fs.existsSync(denoJsonPath);
  });

  console.log(`Found ${foldersWithDenoJson.length} folders with deno.json files:\n`);
  console.log(`${foldersWithDenoJson.join(', ')}\n`);

  if (foldersWithDenoJson.length === 0) {
    console.log(`No folders with deno.json files found in ${FUNCTIONS_DIR}.`);
    process.exit(0);
  }

  foldersWithDenoJson.forEach(folderName => {
    const folderPath = path.join(FUNCTIONS_DIR, folderName);
    installDependencies(folderPath, errorSummary);
  });

  console.log('\n🎉 Dependency installation completed!');

  console.log('\n📊 SUMMARY:');

  if (errorSummary.success.length > 0) {
    console.log(`✅ Successfully installed: ${errorSummary.success.length} folders`);
    console.log(`   ${errorSummary.success.join(', ')}`);
  }

  if (errorSummary.noDenoJson.length > 0) {
    console.log(`\n⚠️  No deno.json found: ${errorSummary.noDenoJson.length} folders`);
    console.log(`   ${errorSummary.noDenoJson.join(', ')}`);
  }

  if (errorSummary.installFailed.length > 0) {
    console.log(`\n❌ Installation failed: ${errorSummary.installFailed.length} folders`);

    const errorGroups = {};
    errorSummary.installFailed.forEach(({ folder, error }) => {
      let errorType = error;

      if (error.includes('Permission denied')) {
        errorType = 'Permission denied';
      } else if (error.includes('network')) {
        errorType = 'Network error';
      } else if (error.includes('not found')) {
        errorType = 'Package not found';
      } else if (error.includes('version')) {
        errorType = 'Version conflict';
      } else {
        errorType = error.split('\n')[0].trim();
      }

      if (!errorGroups[errorType]) {
        errorGroups[errorType] = [];
      }
      errorGroups[errorType].push(folder);
    });

    Object.entries(errorGroups).forEach(([errorType, folders]) => {
      console.log(`   ${errorType}`);
      console.log(`     Affected folders: ${folders.join(', ')}`);
    });
  }

  const totalProcessed = foldersWithDenoJson.length;
  const totalErrors = errorSummary.installFailed.length;

  console.log(`\n📈 TOTALS:`);
  console.log(`   Folders with deno.json: ${totalProcessed}`);
  console.log(`   Successfully installed: ${errorSummary.success.length}`);
  console.log(`   Installation failures: ${totalErrors}`);

  if (totalErrors === 0) {
    console.log('\n🎊 All dependencies installed successfully!');
  } else {
    console.log(`\n🔧 ${totalErrors} folders need attention.`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { installDependencies };
