import { post, get } from './request-util.ts';
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
  const headers = await getHeaders();

  const existingRoles = await get(url, { headers });
  // logger.info(`Fetched roles: ${JSON.stringify(existingRoles.data)}`);
  const role = existingRoles.data.find(role => role.name === roleName);
  if(role) {
    logger.info(`Role '${roleName}' already exists`);
    return { status: 200, data: { id: role.id } };
  }

  // logger.error(JSON.stringify(headers));
  // logger.error(JSON.stringify(url));
  try {
    const response = await post(url, payload, { headers });
    return response;
  } catch (err) {
    logger.error(`Error calling Logto API for role '${roleName}': ${err}`);
    return { status: 500, data: { error: err?.toString?.() || 'Unknown error' } };
  }
}

interface ScopeConfig {
  path: string;
  methods: string[];
  scopes: string[];

}
export async function createLogtoApisAndScopes(scopes: ScopeConfig[]) {
  // remove start ^ and end $ from each scope
  const cleanedScopes = scopes.map(scope => ({
    ...scope,
    path: scope.path.replace(/^\^/, '').replace(/\$$/, '')
  }));

  // Call Logto API to create each scope
  const results = await Promise.all(cleanedScopes.map(async scope => {
    try {
      const apiResource: ({ id, name, scopes } | null) = await getApiResource(scope.path)
      if (!apiResource) {
        const url = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources`;
        const headers = await getHeaders();

        const payload = {
          name: scope.path, // API resource name
          indicator: `https://D2E__DUMMY_URL${scope.path}`
        };

        // create resource
        const response = await post(url, payload, { headers });
        logger.info(`Created resource '${scope.path}': ${response.statusText}`);

        // create scopes
        logger.info(`Created resource '${scope.path}': ${response.statusText}`);
        const { id: resourceId } = await response.data;
        const scopeUrl = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources/${resourceId}/scopes`;
        // Await all child scope creations
        return await Promise.all(scope.scopes.map(async (s) => await createApiResourceScope(resourceId, s)));
      }

      // check API scopes in apiResource.scopes and scope.scopes
      const apiScopes = apiResource.scopes;
      const missingScopes = scope.scopes.filter(s => !(apiScopes.findIndex(apiScope => apiScope.name === s) >= 0));
      logger.info(`Missing scopes for API resource '${apiResource.id}': ${missingScopes.join(', ')}`);

      // create missing scopes
      return await Promise.all(missingScopes.map(async (s) => await createApiResourceScope(apiResource.id, s)));
    } catch (error) {
      logger.error(`Error creating API resource '${scope.path}': ${error}`);
      return null;
    }
  }));
  // Flatten results if needed
  return results.flat();
}

async function getApiResource(name: string) {
  const headers = await getHeaders();
  const pageSize = 100;
  const url = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources?includeScopes=true&page_size=${pageSize}`;
  // logger.error(JSON.stringify(headers));
  // logger.error(JSON.stringify(url));
  const response = await get(url, { headers });
  if (response.status != 200 ) throw new Error('Failed to fetch resources');
  const data = response.data;
  // logger.info(`Fetched resources: ${JSON.stringify(data)}`);

  const found = data.find(r => r.name === name);
  logger.info(`API resource lookup for '${name}': ${found ? 'found' : 'not found'}`);
  if (found) return found;

  return null;
}

async function createApiResourceScope(resourceId: string, scope: string) {
  logger.info(`Creating scope '${scope}' for resource '${resourceId}'`);
  const scopeUrl = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources/${resourceId}/scopes`;
  const scopePayload = {
    name: scope,
    description: scope
  };
  const headers = await getHeaders();

  try {
    const response = await post(scopeUrl, scopePayload, { headers });
    logger.info(`Response creating scope '${scope}' for resource '${resourceId}': ${response.status} ${response.statusText}`);
    if (response.status ) {
      logger.info(`Scope '${scope}' created: scope is '${JSON.stringify(response.data)}'`);
    }
    if (response.status == 422) {
      logger.error(`Scope '${scope}' already exists for resource '${resourceId}'`);
    } else {
      logger.error(`Error creating scope '${scope}' for resource '${resourceId}': ${response.statusText}`);
    }
  } catch (error) {
    logger.error(`Error creating scope '${scope}' for resource '${resourceId}': ${error}`);
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

async function getHeaders() {
  const jwt = await fetchToken();
  const headers = {
    Authorization: `Bearer ${jwt.access_token}`,
    'Content-Type': 'application/json',
  };
  return headers;
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