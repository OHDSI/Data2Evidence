import { isEmpty } from "lodash";

export function getProperties(schema: Record<string, any>) {
  const referenceKey = "$ref";
  const { properties, definitions } = schema;
  const result = { ...schema };

  function getDefinitionKey(inputString: string) {
    const refKey = inputString.split("/");
    return refKey[refKey.length - 1];
  }

  function getDefinitionProperties(definition: Record<string, any>) {
    const result = { ...definition };
    const { required, properties } = result;

    if (required) {
      required.forEach((key: string) => {
        properties[key]["required"] = true;
      });
    }

    for (const prop in properties) {
      if (properties[prop]["anyOf"]) {
        if (properties[prop]["anyOf"].some((i: Record<string, string>) => i.type === "null")) {
          delete properties[prop]["required"];
        }
        const filteredTypes = properties[prop]["anyOf"].filter((i: Record<string, string>) => i.type !== "null");
        properties[prop] = { ...properties[prop], ...filteredTypes[0] };
      }

      if (properties[prop][referenceKey]) {
        const key = getDefinitionKey(properties[prop][referenceKey]);
        const def = definitions[key];
        properties[prop] = { ...properties[prop], ...getDefinitionProperties(def) };
      }
    }
    return result;
  }

  for (const propKey in properties) {
    const property = properties[propKey];
    let referenceKeyArray: [];
    if (property["allOf"]) {
      const referenceArray = property["allOf"];
      referenceKeyArray = referenceArray.map((item: Record<string, any>) => getDefinitionKey(item["$ref"]));
      referenceKeyArray.forEach((key) => {
        const definition = definitions[key];
        if (definition) {
          result.properties[propKey] = getDefinitionProperties(definition);
        }
      });
    }
  }
  return result.properties;
}

export function getParameters(schema: Record<string, any>, parameters?: Record<string, any>) {
  const result: any = {};

  for (const key in schema) {
    const properties = schema[key].properties;

    if (properties) {
      result[key] = {};
      for (const propKey in properties) {
        if (properties[propKey].properties) {
          result[key][propKey] = {};

          for (const childPropKey in properties[propKey].properties) {
            result[key][propKey][childPropKey] = getDefaultValue(properties[propKey].properties[childPropKey]);
          }
        } else {
          result[key][propKey] = getDefaultValue(properties[propKey]);
        }
      }
    } else {
      result[key] = getDefaultValue(schema[key]);
    }
  }

  if (parameters && !isEmpty(parameters)) {
    return findMissing(parameters, result);
  }

  return result;
}

function findMissing(parameters: Record<string, any>, result: Record<string, any>) {
  for (const p in result) {
    if (isObject(result[p])) {
      findMissing(parameters[p], result[p]);
    } else if (!parameters[p]) {
      parameters[p] = result[p];
    }
  }
  return parameters;
}

function getDefaultValue(property: Record<string, any>) {
  if (property.type === "string") {
    return "";
  }
  switch (property.type) {
    case "string":
      return "";
    case "boolean":
      return property.default || false;
    case "array":
      return [];
    case "object":
      return {};
    case "integer":
      return 0;
    default:
      return "";
  }
}

function isObject(value: any) {
  return value !== null && typeof value === "object" && Object.prototype.toString.call(value) === "[object Object]";
}
