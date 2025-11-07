import process from "node:process";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { HealthResponseDto } from "../dto/health.ts";

// deno-lint-ignore require-await
export const health: FastifyPluginAsyncZod = async function (app) {
  // Healthcheck
  app.get(
    "/",
    {
      schema: {
        description: "Get health status of function",
        response: { 200: HealthResponseDto },
      },
    },
    (_req, res) => {
      const healthcheck = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now(),
      };
      try {
        res.send(healthcheck);
      } catch (e) {
        if (e instanceof Error) {
          console.error(e.message);
        } else {
          console.error(e);
        }
        res.code(503).send();
      }
    }
  );
};
