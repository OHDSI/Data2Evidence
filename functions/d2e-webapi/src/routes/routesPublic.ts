import fastify from "fastify";
import { health } from "./health.ts";
import { i18n } from "./i18n.ts";
import { source } from "./source.ts";
import { notification } from "./notification.ts";

export default (app: fastify.FastifyInstance) => {
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
};
