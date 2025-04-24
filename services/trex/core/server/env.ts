export const _env = Deno.env.toObject();
export let global = {
    REQUIRED_URL_SCOPES: [{
      "path": "^/trex/plugins(.*)",
      "scopes": [
        "trex"
      ]
    },{
      "path": "^/trex/db(.*)",
      "scopes": [
        "trex"
      ]
    }],
    ROLE_SCOPES: {
      "ALP_SYSTEM_ADMIN": ['trex']
    },
    PLUGINS_JSON: "{}"
}

export let logger = {
  log: (c: any) => console.log(`\x1b[32m${c}\x1b[0m`), 
  info: (c:any) => console.log(`\x1b[32m${c}\x1b[0m`), 
  debug: (c: any) => console.log(`\x1b[32m${c}\x1b[0m`), 
  error: (c:any) => console.error(`\x1b[35m${c}\x1b[0m`)
};

export const publicURLs = [
    '^/portalsvc/public-graphql$',
    '^/usermgmt/api/user-group/public$',
    '^/system-portal/dataset/public/list$',
    '^/system-portal/feature/list$',
    '^/system-portal/config/public/types.*$',
    '^/system-portal/config/public/overview-description$',
    '^/index.html$',
    '^/assets/.*$',
    '^/api/.*$',
    '^/oidc/.*$',
    '^/sign-in$',
    '^/consent$',
    '^/callback$'
  ]

  export const authz_publicURLs = publicURLs.concat([
    '^/usermgmt/api/user-group/list$'
  ])

export const env = {
    PREFECT_API_URL: _env.PREFECT_API_URL,
    TLS__INTERNAL__CRT: _env.TLS__INTERNAL__CRT?.replace(/\\n/g, '\n'),
    TLS__INTERNAL__KEY: _env.TLS__INTERNAL__KEY?.replace(/\\n/g, '\n'),
    TLS__INTERNAL__CA_CRT: _env.TLS__INTERNAL__CA_CRT?.replace(/\\n/g, '\n'),
    SERVICE_ROUTES: JSON.parse(_env.SERVICE_ROUTES),
    GATEWAY_WO_PROTOCOL_FQDN: _env.GATEWAY__WO_PROTOCOL_FQDN || "localhost",
    LOGTO_CLIENT_ID: _env.LOGTO__CLIENT_ID,
    LOGTO_SCOPE: _env.LOGTO__SCOPE,
    APP_LOCALE: _env.APP_LOCALE,
    IDP_RELYING_PARTY: _env.IDP__RELYING_PARTY,
    DB_CREDENTIALS_PUBLIC_KEYS: _env.DB_CREDENTIALS__PUBLIC_KEYS,
    GATEWAY_IDP_AUTH_TYPE: _env.GATEWAY__IDP_AUTH_TYPE,
    LOGTO_ISSUER: _env.LOGTO__ISSUER,
    LOGTO_AUDIENCES: _env.LOGTO__AUDIENCES,
    LOGTO_SVC_CLIENT_ID: _env.LOGTO__SVC_CLIENT_ID,
    LOGTO_SVC_CLIENT_SECRET: _env.LOGTO__SVC_CLIENT_SECRET,
    NODE_ENV: _env.NODE_ENV,
    _FORCE_CREATE: _env.WATCH_FUNCTIONS ? JSON.parse(_env.WATCH_FUNCTIONS) : false,
    WATCH: _env.WATCH ? JSON.parse(_env.WATCH) : {},
    LOGTO_CLIENT_SECRET: _env.LOGTO__CLIENT_SECRET,
    LOGTO_TOKEN_URL: _env.LOGTO__TOKEN_URL,
    LOGTO_RESOURCE_API: _env.LOGTO__RESOURCE_API,
    GATEWAY_IDP_SUBJECT_PROP: _env.GATEWAY__IDP_SUBJECT_PROP,
    PLUGINS_DEV_PATH: _env.PLUGINS_DEV_PATH || "./plugins",
    REP_PG: _env.REP_PG,
    PREFECT_DOCKER_NETWORK: _env.PREFECT_DOCKER_NETWORK || `${_env.PROJECT_NAME}_data`,
    PREFECT_POOL: "docker-pool",
    SERVICE_ENV: JSON.parse(_env.SERVICE_ENV),
    CADDY__ALP__PUBLIC_FQDN: _env.CADDY__ALP__PUBLIC_FQDN || 'localhost',
    PREFECT_HEALTH_CHECK: _env.PREFECT_API_URL,
  
    PG__DB_NAME: _env.PG__DB_NAME,
    PG__HOST: _env.PG__HOST,
    PG__PORT: _env.PG__PORT,
    PG__USER: _env.PG_MANAGE_USER,
    PG__PASSWORD: _env.PG_MANAGE_PASSWORD,
    PG__SSL: _env.PG__SSL ?? "false",
    PG__CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
    IDP_ALP_SVC_CLIENT_ID: _env.IDP__ALP_SVC_CLIENT_ID,
    IDP_DATA_SVC_CLIENT_ID: _env.IDP__ALP_DATA_CLIENT_ID,
    PREFECT_DOCKER_VOLUMES: JSON.parse(_env.PREFECT_DOCKER_VOLUMES) || [],
    DB_CREDENTIALS__PRIVATE_KEY: _env.DB_CREDENTIALS__PRIVATE_KEY,
    GIT_COMMIT: _env.GIT_COMMIT,
    GH_TOKEN: _env.GH_TOKEN,
    GH_ORG: 'data2evidence',
    PLUGINS_PATH: _env.PLUGINS_PATH || "./data/plugins",
    PLUGINS_API_VERSION: _env.PLUGINS_API_VERSION || 'latest',
    PLUGINS_INIT: _env.PLUGINS_SEED? JSON.parse(_env.PLUGINS_SEED) : [],
    PLUGINS_SEED_UPDATE: JSON.parse(_env.PLUGINS_SEED_UPDATE) === true || false,
    PLUGINS_PULL_POLICY: _env.PLUGINS_PULL_POLICY || 'IfNotPresent',
    PLUGINS_IMAGE_TAG: _env.PLUGINS_IMAGE_TAG || 'develop' 

}

