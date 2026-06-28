import fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import routes from "./routes/routes.ts";

const main = () => {
  const PORT = 4949;
  const routePrefix = "d2e-webapi";

  const app = fastify({
    bodyLimit: 10485760, // 10MiB
  });

  // Add wildcard parser for DELETE requests with invalid Content-Type
  // This runs BEFORE default parsers, so it only catches requests they would reject
  app.addContentTypeParser("*", { parseAs: "buffer" }, (req, payload, done) => {
    // Only handle DELETE requests with invalid/undefined Content-Type
    if (
      req.method === "DELETE" &&
      (!req.headers["content-type"] ||
        req.headers["content-type"] === "undefined" ||
        req.headers["content-type"] === "null")
    ) {
      done(null, null);
    } else {
      // Let default parsers handle everything else
      done(null, payload);
    }
  });

  // Tolerate an empty body on application/json requests. Bodyless DELETEs (e.g. the
  // PA UI's `DELETE /cohortdefinition/:id`) arrive with `Content-Type: application/json`
  // once forwarded through the trex gateway, so they bypass the wildcard parser above
  // and hit Fastify's built-in JSON parser, which rejects an empty body with
  // FST_ERR_CTP_EMPTY_JSON_BODY (400) — leaving the cohort undeleted (breaks the PA
  // bookmark e2e). Override that parser to treat an empty body as no payload while
  // still parsing real JSON bodies.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body: string, done) => {
      if (body === undefined || body === null || body.trim() === "") {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "D2E Webapi",
        description: "D2E implementation of webapis",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: "Localhost",
        },
        {
          url: "https://localhost:41100",
          description: "Development server",
        },
      ],
      tags: [
        {
          name: "cohortdefinition",
          description: "Cohort Definition related end-points",
        },
        { name: "conceptset", description: "Concept Set related end-points" },
        { name: "vocabulary", description: "Vocabulary related end-points" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            description: 'Authorization header token, sample: "Bearer #TOKEN#"',
            type: "http",
            scheme: "Bearer",
          },
          datasetid: {
            description: "Dataset id",
            type: "apiKey",
            name: "datasetid",
            in: "header",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  app.register(fastifySwaggerUI, {
    routePrefix: `/${routePrefix}/documentation`,
    logo: {
      type: "text/plain",
      content: "",
    },
  });

  app.after(() => app.register(routes, { prefix: routePrefix }));

  async function run() {
    await app.ready();

    await app.listen({
      port: PORT,
    });

    console.log(
      `Documentation running at http://localhost:${PORT}/${routePrefix}/documentation`
    );
  }

  run();
};

export { main };
