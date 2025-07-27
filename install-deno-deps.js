#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Installs Deno dependencies for all folders with deno.json files
 * 
 * This script:
 * - Scans the functions directory for folders with deno.json files
 * - Runs `deno install --allow-scripts` in each folder
 * - Provides detailed error reporting and summary
 */

const FUNCTIONS_DIR = './functions';

function installDependencies(folderPath, errorSummary) {
  const folderName = path.basename(folderPath);
  const denoJsonPath = path.join(folderPath, 'deno.json');

  // Check if deno.json exists
  if (!fs.existsSync(denoJsonPath)) {
    console.log(`⚠️  No deno.json found in ${folderName}`);
    errorSummary.noDenoJson.push(folderName);
    return false;
  }

  try {
    console.log(`🔧 Installing dependencies for ${folderName}...`);
    
    // Run deno install with detailed output
    const result = execSync('deno install --allow-scripts', { 
      cwd: folderPath, 
      stdio: 'pipe',
      encoding: 'utf8'
    });

    console.log(`✅ Dependencies installed for ${folderName}`);
    
    // Show any output from deno install if it's informative
    if (result.trim()) {
      const lines = result.trim().split('\n');
      // Only show non-empty, meaningful lines
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
    
    // Extract meaningful error information
    let errorMessage = error.message;
    if (error.stderr) {
      errorMessage = error.stderr.toString().trim() || error.message;
    }
    
    // Show a concise error message
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
  console.log('🔧 Installing Deno dependencies for all folders with deno.json...\n');

  // Initialize error summary
  const errorSummary = {
    success: [],
    noDenoJson: [],
    installFailed: []
  };

  // Check if functions directory exists
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }

  // Get all subdirectories in functions
  const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !name.startsWith('_')); // Skip _shared and similar folders

  // Filter folders that have deno.json files
  const foldersWithDenoJson = folders.filter(folderName => {
    const folderPath = path.join(FUNCTIONS_DIR, folderName);
    const denoJsonPath = path.join(folderPath, 'deno.json');
    return fs.existsSync(denoJsonPath);
  });

  console.log(`Found ${foldersWithDenoJson.length} folders with deno.json files:\n`);
  console.log(`${foldersWithDenoJson.join(', ')}\n`);

  if (foldersWithDenoJson.length === 0) {
    console.log('🤷 No folders with deno.json files found. Run ./generate-deno-config.js first.');
    process.exit(0);
  }

  // Install dependencies for each folder
  foldersWithDenoJson.forEach(folderName => {
    const folderPath = path.join(FUNCTIONS_DIR, folderName);
    installDependencies(folderPath, errorSummary);
  });

  console.log('\n🎉 Dependency installation completed!');

  // Display detailed summary
  console.log('\n📊 DETAILED SUMMARY:');
  
  if (errorSummary.success.length > 0) {
    console.log(`✅ Successfully installed: ${errorSummary.success.length} folders`);
    console.log(`   ${errorSummary.success.join(', ')}`);
  }

  if (errorSummary.noDenoJson.length > 0) {
    console.log(`\n⚠️  No deno.json found: ${errorSummary.noDenoJson.length} folders`);
    console.log(`   ${errorSummary.noDenoJson.join(', ')}`);
    console.log(`   💡 Run ./generate-deno-config.js to create deno.json files`);
  }

  if (errorSummary.installFailed.length > 0) {
    console.log(`\n❌ Installation failed: ${errorSummary.installFailed.length} folders`);
    
    // Group by error type for better readability
    const errorGroups = {};
    errorSummary.installFailed.forEach(({ folder, error }) => {
      // Extract the main error type (remove specific details)
      let errorType = error;
      
      // Common error patterns
      if (error.includes('Permission denied')) {
        errorType = 'Permission denied';
      } else if (error.includes('network')) {
        errorType = 'Network error';
      } else if (error.includes('not found')) {
        errorType = 'Package not found';
      } else if (error.includes('version')) {
        errorType = 'Version conflict';
      } else {
        // Keep first line of error
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

  // Final summary
  const totalProcessed = foldersWithDenoJson.length;
  const totalErrors = errorSummary.installFailed.length;
  
  console.log(`\n📈 FINAL TOTALS:`);
  console.log(`   Folders with deno.json: ${totalProcessed}`);
  console.log(`   Successfully installed: ${errorSummary.success.length}`);
  console.log(`   Installation failures: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n🎊 All dependencies installed successfully!');
    console.log('💡 Your Deno projects are ready to run!');
  } else {
    console.log(`\n🔧 ${totalErrors} folders need attention.`);
    console.log('💡 Check the error details above and resolve issues before running applications.');
  }

  // Exit with appropriate code
  process.exit(totalErrors > 0 ? 1 : 0);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { installDependencies };
