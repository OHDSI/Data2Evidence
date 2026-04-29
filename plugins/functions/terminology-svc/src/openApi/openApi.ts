import * as fs from "fs";
import * as yaml from "yaml";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerApi as registerConceptSetApi } from "./conceptSetApi.ts";
import { registerApi as registerConceptApi } from "./conceptApi.ts";
type Method =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "head"
  | "options"
  | "trace";

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

registerConceptApi(registry);
registerConceptSetApi(registry);

function getOpenApiDocumentation() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Terminology Service API",
      description: "This is the API for Terminology Service",
    },
    servers: [{ url: "v1" }],
  });
}

function writeDocumentation() {
  // OpenAPI JSON
  const docs = getOpenApiDocumentation();

  // YAML equivalent
  const fileContent = yaml.stringify(docs);

  fs.writeFileSync(`./openapi-docs.yml`, fileContent, {
    encoding: "utf-8",
  });
}

const routeMap = registry.definitions
  .filter((v) => v.type === "route")
  .map((v) => {
    if (v.type === "route") {
      return { method: v.route.method, path: v.route.path };
    }
  })
  .reduce(
    (map, obj) => {
      if (!obj) return map;
      const key = `${obj.method}:${obj.path}`;
      map[key] = obj;
      return map;
    },
    {} as {
      [key: string]: {
        method: Method;
        path: string;
      };
    }
  );

export { routeMap, writeDocumentation };
