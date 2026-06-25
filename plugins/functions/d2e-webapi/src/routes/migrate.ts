import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { CohortDefinitionMigrateResponseDto } from "../dto/cohortdefinition.ts";
import { migrateCohortDefinitions } from "../services/migrate.service.ts";

// deno-lint-ignore require-await
export const migrate: FastifyPluginAsyncZod = async function (app) {
  app.post(
    "/cohortdefinition",
    {
      schema: {
        description: "Migrates atlas cohort definitions from Portal to WebAPI.",
        tags: ["migrate"],
        response: { 200: CohortDefinitionMigrateResponseDto },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await migrateCohortDefinitions(req.token);
      res.send(result);
    },
  );
};
