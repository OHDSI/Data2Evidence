import fastify from "fastify";

import { health } from "./health.ts";
import { i18n } from "./i18n.ts";
import { source } from "./source.ts";
import { notification } from "./notification.ts";

import { cohortdefinition } from "./cohortdefinition.ts";
import { conceptset } from "./conceptset.ts";
import { vocabulary } from "./vocabulary.ts";

export default (app: fastify.FastifyInstance) => {
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

  app.register(health, {
    prefix: `/health`,
  });

  app.register(i18n, {
    prefix: "/i18n",
  });

  app.register(source, {
    prefix: "/source",
  });

  app.register(notification, {
    prefix: "/notifications",
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
