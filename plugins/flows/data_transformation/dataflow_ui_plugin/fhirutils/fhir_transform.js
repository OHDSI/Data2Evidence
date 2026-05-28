const fhirTransform = require('@synanetics/fhir-transform');
const transform = fhirTransform.default;

let structureDefinitions = {}

const _structureDefinitionResolver = async (url) => {
  return structureDefinitions[url]
};

const _conceptMapResolver = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    console.warn(`Failed to fetch ConceptMap from ${url}: ${res.status}`);
    return undefined;
  }

  const conceptMap = await res.json();
  return  {
    [url]: conceptMap,
  }
};

async function main() {
    const [,, structureMapJsonString, resourcesJsonString, sourceStructureDefinition, targetStructureDefinition] = process.argv;
    if (!structureMapJsonString || !resourcesJsonString || !sourceStructureDefinition || !targetStructureDefinition) {
      console.error('Invalid input arguments. Please provide structure map, resources array, source structure definition, and target structure definition.');
      process.exit(1);
    }
    try {
      const structureMap = JSON.parse(structureMapJsonString);
      const resources = JSON.parse(resourcesJsonString);
      const parsedSourceDef = JSON.parse(sourceStructureDefinition);
      const parsedTargetDef = JSON.parse(targetStructureDefinition);
      structureMap.structure.forEach((struct) => {
        if (struct.mode == 'source') {
          structureDefinitions[struct.url] = parsedSourceDef;
        } else if (struct.mode == 'target' && struct.url === parsedTargetDef.url) {
          structureDefinitions[struct.url] = parsedTargetDef;
        }
      })
      const results = [];
      for (const resource of resources) {
        const result = await transform({
          content: JSON.parse(resource),
          structureMap: structureMap,
          structureDefinitionResolver: _structureDefinitionResolver,
          conceptMapResolver : _conceptMapResolver,
        });
        results.push(result);
      }
      process.stdout.write(JSON.stringify(results));
    } catch (err) {
      let errorMsg;
      if (err && typeof err === 'object' && err.default) {
        errorMsg = `Transform failed: ${err.default}`;
        console.error(errorMsg);
      } else {
        errorMsg = `Transform failed: ${err}`;
        console.error(errorMsg);
      }
      process.exit(1);
    }
}

main();
