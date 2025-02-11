// deno-lint-ignore no-unused-vars
import fastify from "fastify";

declare module "fastify" {
  export interface FastifyRequest {
    datasetId: string;
    token: string;
  }
}
