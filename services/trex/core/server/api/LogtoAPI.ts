import { post } from './request-util.ts';
import { env, logger } from '../env.ts';

/**
 * Create a role in Logto via POST /api/roles
 * @param roleName The name of the role to create
 * @returns Response object from Logto API
 */
export async function createLogtoRole(roleName: string) {
  const logtoBaseUrl = env.LOGTO__ADMIN_SERVER__FQDN_URL;
  if (!logtoBaseUrl) {
    logger.error('Logto base URL is not set in env.SERVICE_ROUTES.logto');
    return { status: 500, data: { error: 'Logto base URL not set' } };
  }

  const payload = {
    name: roleName,
    description: `Role for ${roleName}`,
    type: 'User'
  };
  const url = `${logtoBaseUrl}/api/roles`;
  const jwt = await fetchToken();
  const headers = {
    Authorization: `Bearer ${jwt.access_token}`,
    'Content-Type': 'application/json',
  };
  try {
    const response = await post(url, payload, { headers });
    return response;
  } catch (err) {
    logger.error(`Error calling Logto API for role '${roleName}': ${err}`);
    return { status: 500, data: { error: err?.toString?.() || 'Unknown error' } };
  }
}

function encodeData(data: any) {
  var formBody: string[] = [];
  for (var property in data) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(data[property]);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  return formBody.join("&");
}

async function fetchToken() {
  let r = await fetch(`${env.LOGTO__ADMIN_SERVER__FQDN_URL}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${env.LOGTO__CLIENTID_PASSWORD__BASIC_AUTH}`,
    },
    body: encodeData({
      grant_type: "client_credentials",
      resource: `${env.LOGTO__DEFAULT_TENANT__FQDN_URL}`,
      scope: "all",
    }),
  });
  let jwt = await r.json();
  return jwt;
}

// TODO: create scopes in logto
export async function createLogtoScope() {
  // Not implemented yet
}