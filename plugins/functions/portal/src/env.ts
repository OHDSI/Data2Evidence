import process from "node:process";

const _env = Deno.env.toObject();

// Database credential from Trex.databaseManager()
interface ITrexDbCredential {
  code: string;
  host: string;
  port: number;
  name: string;
  dialect: string;
  credentials: Array<{
    username: string;
    password: string;
    userScope: string;
  }>;
}

const getDatabaseCredentialsFromTrex = (): ITrexDbCredential[] => {
  try {
    // @ts-ignore Trex is a global provided by the runtime
    const dbm = Trex.databaseManager();
    return dbm.getDatabaseCredentials() as ITrexDbCredential[];
  } catch {
    return [];
  }
};

// Cache credentials at module load
let _cachedDbCredentials: ITrexDbCredential[] | null = null;
const getDbCredentials = (): ITrexDbCredential[] => {
  if (_cachedDbCredentials === null) {
    _cachedDbCredentials = getDatabaseCredentialsFromTrex();
  }
  return _cachedDbCredentials;
};

export const env = {
  SERVICE_ROUTES: process.env.SERVICE_ROUTES || "{}",
  NODE_ENV: _env.NODE_ENV,
  TENANT_ID: _env.APP__TENANT_ID,
  TENANT_NAME: _env.APP__TENANT_NAME,
  SYSTEM_NAME: _env.ALP__SYSTEM_NAME,

  TREX_API_URL: JSON.parse(process.env.SERVICE_ROUTES || '{ "trex": "" }').trex,

  PG_HOST: _env.PG_HOST,
  PG_PORT: parseInt(<string>_env.PG_PORT),
  PG_DATABASE: _env.PG_DATABASE,
  PG_SCHEMA: "portal",
  PG_USER: _env.PG_USER,
  PG_PASSWORD: _env.PG_PASSWORD,
  PG_MANAGE_USER: _env.PG_MANAGE_USER,
  PG_MANAGE_PASSWORD: _env.PG_MANAGE_PASSWORD,
  PG_SSL: _env.PG__SSL,
  PG_CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  PG_MAX_POOL: parseInt(_env.PG__MAX_POOL) || 10,

  DATA_TRANSFORMATION_BUCKET: _env.DATA_TRANSFORMATION_BUCKET,

  SUPABASE_STORAGE_JWT_SECRET: _env.SUPABASE_STORAGE_JWT_SECRET,
  SUPABASE_STORAGE_JWT_TOKEN: _env.SUPABASE_STORAGE_JWT_TOKEN,

  GIT_STUDIES_REPO_URL: _env.GIT_STUDIES_REPO_URL,
  GIT_STUDIES_REPO_BRANCH: _env.GIT_STUDIES_REPO_BRANCH,

  SSL_CA_CERT: _env.SSL_CA_CERT,

  NOTEBOOK_TEMPLATE_REPO_URL: _env.NOTEBOOK_TEMPLATE_REPO_URL,
  NOTEBOOK_TEMPLATE_BRANCH: _env.NOTEBOOK_TEMPLATE_BRANCH,

  GIT_DASHBOARDS_REPO_URL: _env.GIT_DASHBOARDS_REPO_URL,
  GIT_DASHBOARDS_REPO_BRANCH: _env.GIT_DASHBOARDS_REPO_BRANCH,

  USE_PUBLIC_WEBAPI: _env.USE_PUBLIC_WEBAPI || false,
  PUBLIC_WEBAPI_PROXY_URL: _env.PUBLIC_WEBAPI_PROXY_URL,
};

export const services = JSON.parse(env.SERVICE_ROUTES);

export const getDbCredentialsByCode = (databaseCode: string): {
  host: string;
  port: number | string;
  database: string;
  dialect: string;
  username: string;
  password: string;
} | null => {
  const credentials = getDbCredentials();

  for (const cred of credentials) {
    if (cred.code === databaseCode) {
      const readCred = cred.credentials?.find(c => c.userScope === 'Read')
        || cred.credentials?.[0];

      if (!readCred?.username || !readCred?.password) {
        console.warn(
          `No usable database credentials found for code "${databaseCode}".`,
        );
        return null;
      }

      return {
        host: cred.host,
        port: cred.port,
        database: cred.name,
        dialect: cred.dialect === 'postgres' ? 'postgresql' : cred.dialect,
        username: readCred.username,
        password: readCred.password,
      };
    }
  }

  return null;
};
