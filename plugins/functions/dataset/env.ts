import type { LoggingLevel } from "./types.d.ts";

const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  GATEWAY_WO_PROTOCOL_FQDN: _env.GATEWAY_WO_PROTOCOL_FQDN,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
};

export const services = JSON.parse(env.SERVICE_ROUTES);
