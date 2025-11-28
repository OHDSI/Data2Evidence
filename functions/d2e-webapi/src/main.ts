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

  // Remove default content type parsers to handle invalid Content-Type
  app.removeAllContentTypeParsers();

  // Add back JSON parser for application/json
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  // Add wildcard parser - only permissive for DELETE requests
  app.addContentTypeParser('*', (req, payload, done) => {
    // For DELETE requests, allow any Content-Type (including undefined)
    if (req.method === 'DELETE') {
      done(null);
    } else {
      // For other methods, require proper Content-Type
      done(new Error('Content-Type must be application/json for this request'), undefined);
    }
  });

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
