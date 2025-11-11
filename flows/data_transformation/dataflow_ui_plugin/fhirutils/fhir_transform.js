const fhirTransform = require('@synanetics/fhir-transform');
const transform = fhirTransform.default;

let structureDefinitions = {}

const _structureDefinitionResolver = async (url) => {
  return structureDefinitions[url]
};

async function main() {
    const [,, structureMapJsonString, resourceJsonString, sourceStructureDefinition, targetStructureDefinition] = process.argv;
    if (!structureMapJsonString || !resourceJsonString || !sourceStructureDefinition || !targetStructureDefinition) {
      console.error('Invalid input arguments. Please provide structure map, resource, source structure definition, and target structure definition.');
      process.exit(1);
    }
    try {
      const structureMap = JSON.parse(structureMapJsonString);
      const resource = JSON.parse(resourceJsonString);
      structureMap.structure.forEach((struct) => {
        if(struct.mode == 'source'){
          structureDefinitions[struct.url] = JSON.parse(sourceStructureDefinition)
        }
        else if (struct.mode == 'target' && struct.url === JSON.parse(targetStructureDefinition).url) {
          structureDefinitions[struct.url] = JSON.parse(targetStructureDefinition)
        }
      })
      const result = await transform({
        content: JSON.parse(resource),
        structureMap: structureMap,
        structureDefinitionResolver: _structureDefinitionResolver,
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
      process.stdout.write(JSON.stringify({ error: true }));
      process.exit(1);
    }
}

main();