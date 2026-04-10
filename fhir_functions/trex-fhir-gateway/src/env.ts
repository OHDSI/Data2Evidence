const _env = Deno.env.toObject();

export const env = {
  IDP__ALP_DATA__CLIENT_ID: _env.IDP__ALP_DATA_CLIENT_ID,
  IDP__ALP_DATA__CLIENT_SECRET: _env.IDP__ALP_DATA__CLIENT_SECRET,
  ALP_GATEWAY_OAUTH__URL: _env.ALP_GATEWAY_OAUTH__URL,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  BINARY_UPLOAD_LIMIT_SIZE: _env.BINARY_UPLOAD_LIMIT_SIZE,
};

export const services = JSON.parse(env.SERVICE_ROUTES);
export const binaryUploadLimitSize = env.BINARY_UPLOAD_LIMIT_SIZE;
