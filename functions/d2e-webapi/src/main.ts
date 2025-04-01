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

  const app = fastify();

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
