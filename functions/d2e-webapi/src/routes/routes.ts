import fastify from "fastify";
import { health } from "./health.ts";
import { cohortdefinition } from "./cohortdefinition.ts";
import { conceptset } from "./conceptset.ts";
import { vocabulary } from "./vocabulary.ts";

export default (app: fastify.FastifyInstance) => {
  app.register(health, {
    prefix: "/health",
  });

  // TODO: Tempoarily put datasetid to be received in req header, will change to move to query params/body | after discussion
  // Add hook to pull datasetId and token from req header
  app.addHook("preHandler", (req, res, done) => {
    // Get datasetId from header
    if (!req.headers.datasetid) {
      res.status(400).send("datasetid missing in request header");
    }

    req.datasetId = req.headers.datasetid as string;

    // Get token from header
    if (!req.headers.authorization) {
      res.status(400).send("Bearer token missing in request header");
    }

    req.token = req.headers.authorization as string;
    done();
  });

  app.register(cohortdefinition, {
    prefix: "/cohortdefinition",
  });
  app.register(conceptset, {
    prefix: "/conceptset",
  });
  app.register(vocabulary, {
    prefix: "/vocabulary",
  });
};
