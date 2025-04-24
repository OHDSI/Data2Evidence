import fastify from "fastify";

import { cohortdefinition } from "./cohortdefinition.ts";
import { conceptset } from "./conceptset.ts";
import { vocabulary } from "./vocabulary.ts";

export default (app: fastify.FastifyInstance) => {
  // Add hook to pull datasetId from req header
  app.addHook("preHandler", (req, res, done) => {
    if (!req.headers.datasetid) {
      return res.status(400).send("datasetid missing in request header");
    }

    req.datasetId = req.headers.datasetid as string;
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
