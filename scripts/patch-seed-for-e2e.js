#!/usr/bin/env node
/**
 * Patches the seed config to use race instead of Age for e2e test stability.
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
  '"categories": ["patient.attributes.race"]'
);

// Same-line format: 1 occurrence with JS-style unquoted keys
content = content.replaceAll(
  'categories: ["patient.attributes.Age"]',
  'categories: ["patient.attributes.race"]'
);

// Multiline format: 1 occurrence where value is on separate line (line 13282)
content = content.replaceAll(
  '"categories": [\n                "patient.attributes.Age"\n            ]',
  '"categories": [\n                "patient.attributes.race"\n            ]'
);

// Set initial: true for race attribute in filtercard (line 9910)
// This ensures race appears as the default chart category
content = content.replace(
  `"source": "patient.attributes.race",
                    "ordered": false,
                    "cached": true,
                    "useRefText": true,
                    "useRefValue": true,
                    "category": true,
                    "measure": false,
                    "filtercard": {
                        "initial": false,`,
  `"source": "patient.attributes.race",
                    "ordered": false,
                    "cached": true,
                    "useRefText": true,
                    "useRefValue": true,
                    "category": true,
                    "measure": false,
                    "filtercard": {
                        "initial": true,`
);

fs.writeFileSync(SEED_FILE, content, "utf8");
console.log("Patched seed file: replaced Age with race in categories arrays and set race initial to true");
