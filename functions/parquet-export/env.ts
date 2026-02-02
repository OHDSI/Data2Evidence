const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  SERVICE_ROUTES: _env.SERVICE_ROUTES ? JSON.parse(_env.SERVICE_ROUTES) : {},
  SQL_QUERY_TEMPLATES: _env.SQL_QUERY_TEMPLATES ? JSON.parse(_env.SQL_QUERY_TEMPLATES) : null,
};
