const fs = require('fs');
const path = require('path');
// fhir_transform.js
const fhirTransform = require('@synanetics/fhir-transform');
const transform = fhirTransform.default;

const structureDefinitionResolver = (url) => {
  switch (url) {
    case 'http://hl7.org/fhir/uv/omop/StructureDefinition/Observation':
    // case 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab':
      {
        const obsPath = path.join(__dirname, 'Observation.json');
        const obsJson = fs.readFileSync(obsPath, 'utf8');
        const obsDef = JSON.parse(obsJson);
        return { [url]: obsDef };
      }
    case 'http://hl7.org/fhir/StructureDefinition/AllergyIntolerance':
    // case 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance':
      {
        const allergyPath = path.join(__dirname, 'AllergyIntolerance.json');
        const allergyJson = fs.readFileSync(allergyPath, 'utf8');
        const allergyDef = JSON.parse(allergyJson);
        return { [url]: allergyDef };
      }
  }
};

const conceptMapResolver = async (url) => {
  const record = {};
  const map = await fetch(url);
  console.log('Fetched concept map from:', url);
  record[url] = await map.json();
  if (map.group[0].unmapped?.url) {
    const otherMap = await fetch(map.group[0].unmapped.url);
    console.log('Fetched unmapped concept map from:', map.group[0].unmapped.url);
    record[map.group[0].unmapped.url] = await otherMap.json();
  }
};

async function main() {
  const [,, structureMapJsonString, resourceJsonString] = process.argv;
  if (!structureMapJsonString || !resourceJsonString) {
    console.error('Usage: node fhir_transform.js <structureMapJsonString> <resourceJsonString>');
    process.exit(1);
  }
  let resource, structureMap;
  try {
    structureMap = JSON.parse(structureMapJsonString);
  } catch (err) {
    console.error('Invalid structureMap JSON string:', err);
    process.exit(1);
  }
  try {
    resource = JSON.parse(resourceJsonString);
  } catch (err) {
    console.error('Invalid resource JSON string:', err);
    process.exit(1);
  }
  try {
    const result = await transform({
      resource,
      structureMap,
      structureDefinitionResolver,
      conceptMapResolver
    });
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    if (err && typeof err === 'object' && err.default) {
      console.error('Transform failed:', err.default);
    } else {
      console.error('Transform failed:', err);
    }
    process.exit(1);
  }
}
main();