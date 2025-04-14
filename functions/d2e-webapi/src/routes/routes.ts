import fastify from "fastify";

import { health } from "./health.ts";
import { source } from "./source.ts";
import { i18n } from "./i18n.ts";
import { notification } from "./notification.ts";

import datasetRoutes from "./datasetRoutes.ts";

export default (app: fastify.FastifyInstance) => {
  // Add hook to pull token from req header
  app.addHook("preHandler", (req, res, done) => {
    if (!req.headers.authorization) {
      res.status(400).send("Bearer token missing in request header");
    }

    req.token = req.headers.authorization as string;
    done();
  });

  app.register(health, {
    prefix: `/health`,
  });

  app.register(source, {
    prefix: "/source",
  });

  app.register(i18n, {
    prefix: "/i18n",
  });

  app.register(notification, {
    prefix: "/notifications",
  });

  // Register dataset routes, which required datasetId in request headers
  app.after(() => app.register(datasetRoutes));
};
