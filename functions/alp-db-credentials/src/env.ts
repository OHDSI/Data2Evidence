import { Deno } from '@deno/shim-deno'

type LoggingLevel = 'info' | 'warn' | 'error'
const _env = Deno.env.toObject()
export const env = {
  NODE_ENV: _env.NODE_ENV,
  PORT: Number(_env.DB_CREDENTIALS_MGR__PORT) || 9007,
  LOG_LEVEL: (_env.DB_CREDENTIALS_MGR__LOG_LEVEL as LoggingLevel) || 'info',
  VOCAB_SCHEMAS: JSON.parse(_env.DB_CREDENTIALS_MGR__VOCAB_SCHEMAS || '{}'),
  DATABASE_CREDENTIALS: _env.DATABASE_CREDENTIALS,
  PG_HOST: _env.PG__HOST,
  PG_PORT: Number(_env.PG__PORT),
  PG_DATABASE: _env.PG__DB_NAME,
  PG_SCHEMA: _env.PG__DB_CREDENTIALS_MGR__SCHEMA,
  PG_USER: _env.PG__DB_CREDENTIALS_MGR__USER,
  PG_PASSWORD: _env.PG__DB_CREDENTIALS_MGR__PASSWORD,
  PG_MANAGE_USER: _env.PG__DB_CREDENTIALS_MGR__MANAGE_USER,
  PG_MANAGE_PASSWORD: _env.PG__DB_CREDENTIALS_MGR__MANAGE_PASSWORD,
  PG_SSL: _env.PG__SSL ?? "false",
  PG_CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  PG_MAX_POOL: Number(_env.PG__MAX_POOL) || 10,
  VALID_CLIENT_CREDENTIAL_IDS: _env.DB_CREDENTIALS_MGR__VALID_CLIENT_CREDENTIAL_IDS || '',
  SSL_PRIVATE_KEY: _env.TLS__INTERNAL__KEY?.replace(/\\n/g, '\n'),
  SSL_PUBLIC_CERT: _env.TLS__INTERNAL__CRT?.replace(/\\n/g, '\n'),
  SSL_CA_CERT: _env.TLS__INTERNAL__CA_CRT?.replace(/\\n/g, '\n')
}
