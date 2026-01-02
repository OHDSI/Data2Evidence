#!/usr/bin/env node
/**
 * Patches the seed config to use monthOfBirth instead of Age for e2e test stability.
 * Age-based categories change with each new year, causing screenshot test failures.
 */
const fs = require("fs");
const path = require("path");

const SEED_FILE = path.join(
  __dirname,
  "../functions/mri-pg-config/src/db/seeds/03_Config.ts"
);

if (!fs.existsSync(SEED_FILE)) {
  console.error(`Error: Seed file not found at ${SEED_FILE}`);
  process.exit(1);
}

let content = fs.readFileSync(SEED_FILE, "utf8");

// Same-line format: 3 occurrences with JSON-style quoted keys
content = content.replaceAll(
  '"categories": ["patient.attributes.Age"]',
  '"categories": ["patient.attributes.monthOfBirth"]'
);

// Same-line format: 1 occurrence with JS-style unquoted keys
content = content.replaceAll(
  'categories: ["patient.attributes.Age"]',
  'categories: ["patient.attributes.monthOfBirth"]'
);

// Multiline format: 1 occurrence where value is on separate line (line 13282)
content = content.replaceAll(
  '"categories": [\n                "patient.attributes.Age"\n            ]',
  '"categories": [\n                "patient.attributes.monthOfBirth"\n            ]'
);

// Set initial: true for monthOfBirth attribute in filtercard (3 occurrences)
// This ensures monthOfBirth appears as the default chart category
content = content.replaceAll(
  `"source": "patient.attributes.monthOfBirth",
                    "ordered": true,
                    "cached": true,
                    "useRefText": false,
                    "useRefValue": false,
                    "category": true,
                    "measure": true,
                    "filtercard": {
                        "initial": false,`,
  `"source": "patient.attributes.monthOfBirth",
                    "ordered": true,
                    "cached": true,
                    "useRefText": false,
                    "useRefValue": false,
                    "category": true,
                    "measure": true,
                    "filtercard": {
                        "initial": true,`
);

fs.writeFileSync(SEED_FILE, content, "utf8");
console.log("Patched seed file: replaced Age with monthOfBirth in categories arrays and set monthOfBirth initial to true");
