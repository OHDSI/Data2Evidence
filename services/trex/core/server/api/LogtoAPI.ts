import { post, get } from './request-util.ts';
import { env, logger } from '../env.ts';


interface Scope {
  tenantId: string;
  id: string;
  resourceId: string;
  name: string;
  description: string;
}


interface ResourceType {
  id: string;
  name: string;
  type: string;
  scopes: Scope[];
}

let cachedResources: ResourceType[] | null = null;
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

  const existingRoles = await get(url, { headers, timeout: 30000 });
  const role = existingRoles.data.find(role => role.name === roleName);
  if(role) {
    return { status: 422, data: { id: role.id } };
  }

  try {
    const response = await post(url, payload, { headers, timeout: 30000 });
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
  let cleanedScopes = scopes.map(scope => ({
    ...scope,
    path: scope.path.replace(/^\^/, '').replace(/\$$/, '')
  }));

  // cleanedScopes = cleanedScopes.slice(0, 10);
  // Call Logto API to create each scope
  cleanedScopes.forEach(async scope => {
    try {
      const url = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources`;
      const headers = await getHeaders();

      const payload = {
        name: scope.path, // API resource name
        indicator: `https://D2E__DUMMY_URL${scope.path}`
      };

      // Check if resource already exists
      let apiResource = await getApiResource(scope.path);
      if (!apiResource) {
        // create resource
        let response = await post(url, payload, { headers, timeout: 30000 });
        if (response.status != 201) {
          logger.error(`Error creating resource '${scope.path}': ${response.statusText}`);
          return null;
        } 
        logger.info(`Created resource '${scope.path}': ${response.statusText}`);
        apiResource = response.data;
      }

      // check API scopes in apiResource.scopes and scope.scopes
      const existingScopes = apiResource?.scopes || [];
      logger.debug(`Existing scopes for API resource '${apiResource?.name}': ${JSON.stringify(existingScopes)}`);
      const missingScopes = scope.scopes.filter(s => !(existingScopes.findIndex(apiScope => apiScope.name === s) >= 0));
      logger.debug(`Missing scopes for API resource '${apiResource?.name}': ${missingScopes.join(', ')}`);

      // create missing scopes
      await Promise.all(missingScopes.map(async (s) => await createApiResourceScope(apiResource?.id || "", s)));
      return apiResource?.id;
    } catch (error) {
      logger.error(`Error creating API resource '${scope.path}': ${error}`);
      return null;
    }
  });
}

async function getApiResource(name: string) {

  if (cachedResources) {
    const foundIndex = cachedResources.findIndex(r => r.name === name);
    if (foundIndex !== -1) return cachedResources[foundIndex];
  }

  // Fetch all resources (pagination logic as previously planned)
  cachedResources = await fetchAllResourcesFromApi();

  const foundIndex = cachedResources.findIndex(r => r.name === name);
  logger.debug(`Total API Resources: ${cachedResources.length}`)
  logger.info(`API resource lookup for '${name}': ${foundIndex !== -1 ? 'found' : 'not found'}`);
  if (foundIndex !== -1) return cachedResources[foundIndex];

  return null;
}

async function fetchAllResourcesFromApi(): Promise<ResourceType[]> {
  const headers = await getHeaders();
  const pageSize = 100;
  let page = 1;
  let url = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources?includeScopes=true&page_size=${pageSize}&page=${page}`;
  let response = await get(url, { headers, timeout: 30000 });
  if (response.status != 200 ) throw new Error('Failed to fetch resources');
  let data = response.data;
  const totalNumber = parseInt(response.headers.get('total-number') || '0');
  const numPages = Math.ceil(totalNumber / pageSize);

  // Fetch remaining pages if needed
  for (page = 2; page <= numPages; page++) {
    url = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources?includeScopes=true&page_size=${pageSize}&page=${page}`;
    const r = await get(url, { headers, timeout: 30000 });
    if (r.status != 200) throw new Error('Failed to fetch resources');
    const pageData = r.data;
    data = data.concat(pageData);
  }
  
  return data;
}

async function createApiResourceScope(resourceId: string, scope: string) {
  if(resourceId == "") return;
  const scopeUrl = `${env.LOGTO__ADMIN_SERVER__FQDN_URL}/api/resources/${resourceId}/scopes`;
  const scopePayload = {
    name: scope,
    description: scope
  };
  const headers = await getHeaders();

  try {
    const response = await post(scopeUrl, scopePayload, { headers, timeout: 30000 });
    if (response.status === 201) {
      logger.info(`Scope '${scope}' created`);
    } else if (response.status === 422) {
      logger.info(`Scope '${scope}' already exists for resource '${resourceId}'`);
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