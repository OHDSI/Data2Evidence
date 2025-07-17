// Environment configuration for ALP FHIR Service running on Deno 2
type LoggingLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const _env = Deno.env.toObject();

export const env = {
  // FHIR Server configuration
  FHIR_PORT: Number(Deno.env.get("FHIR__PORT")) || 8103,
  FHIR_LOG_LEVEL: (Deno.env.get("FHIR__LOG_LEVEL") as LoggingLevel) || "DEBUG",

  // Binary upload limits
  BINARY_UPLOAD_LIMIT_SIZE:
    Number(Deno.env.get("BINARY_UPLOAD_LIMIT_SIZE")) || 1000000000,

  // Database configuration
  PG_HOST: Deno.env.get("PG__HOST") || "localhost",
  PG_PORT: Number(Deno.env.get("PG__PORT")) || 5432,
  PG_DB_NAME: Deno.env.get("PG__DB_NAME") || "medplum",
  PG_SUPER_USER: Deno.env.get("PG_SUPER_USER") || "postgres",
  PG_SUPER_PASSWORD: Deno.env.get("PG_SUPER_PASSWORD") || "postgres",
  PG_CA_ROOT_CERT: Deno.env.get("PG__CA_ROOT_CERT"),
  PG_SSL: _env.PG__SSL,

  // Custom FHIR Schema
  FHIR_CUSTOM_SCHEMA: Deno.env.get("FHIR_CUSTOM_SCHEMA") || "fhir",

  // Redis configuration
  REDIS_HOST: Deno.env.get("REDIS_HOST") || "localhost",
  REDIS_PORT: Number(Deno.env.get("REDIS_PORT")) || 6379,
  REDIS_PASSWORD: Deno.env.get("REDIS_PASSWORD") || "",

  // Node.js compatibility
  NODE_ENV: _env.NODE_ENV || "production",
  GOOGLE_APPLICATION_CREDENTIALS: _env.GOOGLE_APPLICATION_CREDENTIALS,
  GCLOUD_PROJECT: _env.GCLOUD_PROJECT,

  // SSL/TLS configuration
  SSL_PRIVATE_KEY: Deno.env.get("TLS__INTERNAL__KEY")?.replace(/\\n/g, "\n"),
  SSL_PUBLIC_CERT: Deno.env.get("TLS__INTERNAL__CRT")?.replace(/\\n/g, "\n"),
  SSL_CA_CERT: Deno.env.get("TLS__INTERNAL__CA_CRT")?.replace(/\\n/g, "\n"),

  // System configuration
  ALP_SYSTEM_NAME: Deno.env.get("ALP__SYSTEM_NAME"),
  APP_TENANT_ID: Deno.env.get("APP__TENANT_ID"),

  // Identity Provider configuration
  IDP_BASE_URL: Deno.env.get("IDP__BASE_URL"),
  IDP_RELYING_PARTY: Deno.env.get("IDP__RELYING_PARTY"),
  IDP_FETCH_USER_INFO_TYPE: Deno.env.get("IDP__FETCH_USER_INFO_TYPE"),

  // Service routes
  SERVICE_ROUTES: Deno.env.get("SERVICE_ROUTES") || "{}",
};

export const services = JSON.parse(env.SERVICE_ROUTES);
