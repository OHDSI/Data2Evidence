#!/usr/bin/env node
/**
 * Patches the seed config to use monthOfBirth instead of Age for e2e test stability.
 * Age-based categories change with each new year, causing screenshot test failures.
 */
const fs = require("fs");
const path = require("path");

const SEED_FILE = path.join(
  __dirname,
  "../plugins/functions/mri-pg-config/src/db/seeds/03_Config.ts"
);

if (!fs.existsSync(SEED_FILE)) {
  console.error(`Error: Seed file not found at ${SEED_FILE}`);
  process.exit(1);
}

let content = fs.readFileSync(SEED_FILE, "utf8");

// Same-line format: JSON-style quoted keys with [gender, Age] pair
// Handles Gender, Gender_concept_name, and gender variants
content = content.replace(
  /"categories": \["patient\.attributes\.\w+", "patient\.attributes\.Age"\]/g,
  (match) => match.replace("patient.attributes.Age", "patient.attributes.monthOfBirth")
);

// Same-line format: JS-style unquoted keys with [gender, Age] pair
content = content.replace(
  /categories: \["patient\.attributes\.\w+", "patient\.attributes\.Age"\]/g,
  (match) => match.replace("patient.attributes.Age", "patient.attributes.monthOfBirth")
);

// Multiline format: 1 occurrence where values are on separate lines
content = content.replaceAll(
  '"categories": [\n                "patient.attributes.Gender",\n                "patient.attributes.Age"\n            ]',
  '"categories": [\n                "patient.attributes.Gender",\n                "patient.attributes.monthOfBirth"\n            ]'
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

// Re-enable the Atlas cohort-definition feature (the "Atlas" + "Import" cohort
// buttons) for e2e only. The committed seed keeps it off because the in-PA Atlas
// button is superseded by standalone Atlas3; e2e still asserts the button exists
// (without opening the removed Atlas Lite iframe), so flip it on just for tests.
content = content.replaceAll(
  '"atlasCohortDefinition": false',
  '"atlasCohortDefinition": true'
);

fs.writeFileSync(SEED_FILE, content, "utf8");
console.log("Patched seed file: replaced Age with monthOfBirth in categories arrays, set monthOfBirth initial to true, and enabled atlasCohortDefinition for e2e");
