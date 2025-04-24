const _env = Deno.env.toObject();

export const env = {
  FHIR__CLIENT_ID: _env.FHIR__CLIENT_ID,
  FHIR__CLIENT_SECRET: _env.FHIR__CLIENT_SECRET,
  FHIR__LOG_LEVEL: _env.FHIR__LOG_LEVEL,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || '{}',
  BINARY_UPLOAD_LIMIT_SIZE: _env.BINARY_UPLOAD_LIMIT_SIZE
}

export const services = JSON.parse(env.SERVICE_ROUTES)
export const binaryUploadLimitSize = env.BINARY_UPLOAD_LIMIT_SIZE