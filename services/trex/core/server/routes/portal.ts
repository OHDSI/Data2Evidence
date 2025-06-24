import { env,global } from '../env.ts'
import { Hono, Context } from "npm:hono";

export function addRoutes(app: Hono) {
  const GATEWAY_WO_PROTOCOL_FQDN = env.GATEWAY_WO_PROTOCOL_FQDN!
  const GATEWAY_PROTOCOL_FQDN = `https://${GATEWAY_WO_PROTOCOL_FQDN}/`
  const CLIENT_ID = env.LOGTO_CLIENT_ID
  const AUTHORIZATION_URL = `${GATEWAY_PROTOCOL_FQDN}oidc/auth`
  const END_SESSION_URL = `${GATEWAY_PROTOCOL_FQDN}oidc/session/end?client_id=${CLIENT_ID}&redirect={window.location.origin}/portal`
  const SCOPE = env.LOGTO_SCOPE


  app.get('/portal/plugin.json', (c: Context) => {
    return c.json(global.PLUGINS_JSON);
  });

  app.get('/portal/env.js', (c: Context) => {
    const clientEnv = {
      PUBLIC_URL: '/portal',
      REACT_APP_LOCALE: env.APP_LOCALE,
      GIT_COMMIT: env.GIT_COMMIT,
      REACT_APP_IDP_RELYING_PARTY: env.IDP_RELYING_PARTY,
      REACT_APP_DN_BASE_URL: GATEWAY_PROTOCOL_FQDN,
      REACT_APP_CURRENT_SYSTEM: 'Local',
      REACT_APP_IDP_SUBJECT_PROP: 'sub',
      REACT_APP_IDP_NAME_PROP: 'username',
      REACT_APP_IDP_OIDC_CONFIG: `{ "client_id": "${CLIENT_ID}", "redirect_uri": "{window.location.origin}/portal/login-callback", "authority": "${GATEWAY_PROTOCOL_FQDN}", "authority_configuration": { "issuer": "${GATEWAY_PROTOCOL_FQDN}oidc", "authorization_endpoint": "${AUTHORIZATION_URL}", "token_endpoint": "https://${GATEWAY_WO_PROTOCOL_FQDN}/oauth/token", "end_session_endpoint": "${END_SESSION_URL}" }, "scope": "${SCOPE}", "refresh_time_before_tokens_expiration_in_second": 180 }`,
      REACT_APP_DB_CREDENTIALS_PUBLIC_KEYS: certEscapeNewLine(env.DB_CREDENTIALS_PUBLIC_KEYS || "").replace('}\\n', '}'),
      REACT_APP_PLUGINS: global.PLUGINS_JSON,
      REACT_APP_MRI_CONFIG_NAME: 'OMOP_GDM_PA_CONF' // Currently supporting static configs
    }
    c.header('Content-Type', 'application/javascript')
    
    return c.body(`window.ENV_DATA = ${JSON.stringify(clientEnv)}`);
  })
}

const certEscapeNewLine = (str: string) => {
  return str.replace(/-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----/gs, (match) => {
    return match.replace(/\n/g, "\\n"); 
  });
}
