import { IDbCreateDto } from "./type.d.ts";

const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  DEMO_DB_CODE: _env.DEMO__DB_CODE,
  DEMO_DB_CDM_SCHEMA: _env.DEMO__DB_CDM_SCHEMA,
  DEMO_DB_RESULT_SCHEMA: _env.DEMO__DB_RESULT_SCHEMA,
  DEMO_DB_DEFAULT: JSON.parse(_env.DEMO__DB_DEFAULT || "{}") as IDbCreateDto,
  DEMO_DB_USER: _env.DEMO__DB_USER,
  DEMO_DB_PASSWORD: _env.DEMO__DB_PASSWORD,
  DEMO_DATASET: JSON.parse(_env.DEMO__DATASET || "{}"),
};

export const services = JSON.parse(env.SERVICE_ROUTES);
