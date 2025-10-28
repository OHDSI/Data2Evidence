const fs = require('fs');
const path = require('path');
// const r4 = require('@types/fhir');
const fhirTransform = require('@synanetics/fhir-transform');
const { url } = require('inspector');
const transform = fhirTransform.default;

let structureDefinitions = {}

const _structureDefinitionResolver = async (url) => {
  return structureDefinitions[url]
};

async function main() {
  const [,, structureMapJsonString, resourceJsonString, sourceStructureDefinition, targetStructureDefinition] = process.argv;
  if (!structureMapJsonString || !resourceJsonString) {
    console.error('Usage: node fhir_transform.js <structureMapJsonString> <resourceJsonString>');
    process.exit(1);
  }
    let resource, structureMap;
    try {
      const structureMapObj = JSON.parse(structureMapJsonString);
      let structureList;
      if (Array.isArray(structureMapObj.structure)) {
        structureList = structureMapObj.structure;
      } else if (typeof structureMapObj.structure === 'object') {
        structureList = [structureMapObj.structure];
      } else {
        structureList = [];
      }
      structureMapObj.structure = structureList;
      structureMap = structureMapObj;
      structureMap.structure.forEach((struct) => {
        if(struct.mode == 'source'){
          //Call fhir server to get source structure definition
          structureDefinitions[struct.url] = JSON.parse(sourceStructureDefinition)
        }
        else if (struct.mode == 'target' && struct.url === targetStructureDefinition.url) {
          structureDefinitions[struct.url] = JSON.parse(targetStructureDefinition)
        }
      })
    } catch (err) {
      console.error('Invalid structureMap JSON string or StructureMap parse error:', err);
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
      content: resource,
      structureMap: structureMap,
      structureDefinitionResolver: _structureDefinitionResolver
    });
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    let errorMsg;
    if (err && typeof err === 'object' && err.default) {
      errorMsg = `Transform failed: ${err.default}`;
      console.error(errorMsg);
    } else {
      errorMsg = `Transform failed: ${err}`;
      console.error(errorMsg);
    }
    // Always output a valid JSON error to stdout
    process.stdout.write(JSON.stringify({ error: true }));
    process.exit(1);
  }
}

main();