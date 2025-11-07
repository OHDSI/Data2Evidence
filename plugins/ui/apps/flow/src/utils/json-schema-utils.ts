import jsonata from "jsonata";

export const getProperties = async (
  jsonSchema: string,
  name: string = "Main"
) => {
  let jsonObj = {};
  try {
    jsonObj = JSON.parse(jsonSchema);
  } catch (e) {
    console.warn(`Unable to parse json schema: ${jsonSchema}`, e);
  }

  const expr = jsonata(`definitions.${name}.properties`);
  return await expr.evaluate(jsonObj);
};
