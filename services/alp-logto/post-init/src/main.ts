import * as logto from "./middleware/logto";
import * as pg from "pg";

async function create(
  path: string,
  headers: object,
  data: object,
  hasResponseBody = true
) {
  try {
    console.log(`Request creation ${path}`);
    console.log(`${JSON.stringify(data)}`);
    const resp = await logto.post(path, headers, data);
    console.log(`Responded with ${resp.status}`);

    if (resp.ok) {
      if (hasResponseBody) {
        let json = await resp.json();
        console.log(JSON.stringify(json));
        return json;
      }
    } else {
      console.error("Request failed");
      console.error(resp.statusText, " ", path, " ", JSON.stringify(data));
      return -1;
    }
  } catch (error) {
    throw error;
  }
}

async function update(
  path: string,
  headers: object,
  data: object,
  hasResponseBody = true
) {
  try {
    console.log(`Request update ${path}`);
    console.log(JSON.stringify(data));
    const resp = await logto.patch(path, headers, data);
    console.log(`Responded with ${resp.status}`);

    if (resp.ok) {
      if (hasResponseBody) {
        let json = await resp.json();
        console.log(JSON.stringify(json));
        return json;
      }
    } else {
      console.error("Request failed");
      console.error(resp.statusText, " ", path, " ", JSON.stringify(data));
      return -1;
    }
  } catch (error) {
    throw error;
  }
}

async function upsert(
  path: string,
  headers: object,
  data: object,
  hasResponseBody = true
) {
  try {
    console.log(`Request create/update ${path}`);
    console.log(JSON.stringify(data));
    const resp = await logto.put(path, headers, data);
    console.log(`Responded with ${resp.status}`);

    if (resp.ok) {
      if (hasResponseBody) {
        let json = await resp.json();
        console.log(JSON.stringify(json));
        return json;
      }
    } else {
      console.error("Request failed");
      console.error(resp.statusText, " ", path, " ", JSON.stringify(data));
      return -1;
    }
  } catch (error) {
    throw error;
  }
}

async function fetchExisting(path: string, headers: object, showLog = true) {
  try {
    showLog && console.log(`Request existing ${path}`);
    const resp = await logto.get(path, headers);
    showLog && console.log(`Responded with ${resp.status}`);

    if (resp.ok) {
      let json = await resp.json();
      showLog && console.log(JSON.stringify(json));
      return json;
    } else {
      console.error("Request failed");
      console.error(resp.statusText, " ", path);
      return -1;
    }
  } catch (error) {
    throw error;
  }
}

async function queryPostgres(
  client: pg.Client,
  query: string,
  values: Array<string | number>
) {
  return await client.query(query, values);
}

async function main() {
  let apps: Array<{ name: string; id: string }> =
    JSON.parse(process.env.LOGTO__CLIENT_APPS) || [];

  let resource: { name: string } = JSON.parse(process.env.LOGTO__RESOURCE) || {
    name: "alp-default",
    indicator: "https://alp-default",
    accessTokenTtl: 3600,
  };

  let user: { username: string; initialPassword: string } = JSON.parse(
    process.env.LOGTO__USER
  );

  let scopes: Array<{ name: string }> =
    JSON.parse(process.env.LOGTO__SCOPES) || [];

  let roles: Array<{ name: string }> =
    JSON.parse(process.env.LOGTO__ROLES) || [];

  let jwt = await logto.fetchToken();
  let accessToken: string = jwt.access_token;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Create Apps
  console.log(
    "*********************************** APPLICATIONS **********************************************"
  );

  const fetchExistingApps: Array<Object> = await fetchExisting(
    "applications",
    headers
  );
  const APP_ENVS: string[] = [];
  for (const app of apps) {
    const appExists = fetchExistingApps.find(
      (existingApp: any) => existingApp.name === app.name
    );

    if (appExists) {
      await update(`applications/${app.id}`, headers, app); //Update other attributes such as oidcClientMetadata and custom_client_metadata
    }
  }

  // Create Resource
  console.log(
    "*********************************** RESOURCE **********************************************"
  );
  const fetchExistingResources: Array<{ name: string }> = await fetchExisting(
    "resources",
    headers
  );
  const resourceExists = fetchExistingResources.find(
    (existingRes: any) => existingRes.name === resource.name
  );
  let { id: resourceId, isDefault } =
    resourceExists || (await create("resources", headers, resource));

  if (resourceExists) {
    const updated = await update(`resources/${resourceId}`, headers, resource);
    isDefault = updated.isDefault;
  }

  if (!isDefault) {
    // Set the resource as the default
    await logto.patch(`resources/${resourceId}/is-default`, headers, {
      isDefault: true,
    });
  }

  console.log(
    "*********************************************************************************\n"
  );

  // Create Users
  console.log(
    "*********************************** USERS **********************************************"
  );
  const fetchExistingUsers: Array<{ username: string }> = await fetchExisting(
    "users",
    headers
  );
  const userExists = fetchExistingUsers.find(
    (existingUser: any) =>
      existingUser.username === user.username &&
      existingUser.tenant_id === "default"
  );
  let logtoAdminUser = userExists || (await create("users", headers, user));

  if (userExists) {
    await update(`users/${logtoAdminUser.id}`, headers, user);
  }

  if (!logtoAdminUser["lastSignInAt"])
    await logto.patch(`users/${logtoAdminUser.id}/password`, headers, {
      password: user["initialPassword"],
    });

  console.log(
    "*********************************************************************************\n"
  );

  // Create Scopes
  console.log(
    "*********************************** SCOPES **********************************************"
  );
  const fetchExistingResourceScopes: Array<Object> = await fetchExisting(
    `resources/${resourceId}/scopes`,
    headers
  );
  let logtoScopes: Array<LogtoScope> = [];
  for (const s of scopes) {
    const resourceScopeExists = fetchExistingResourceScopes.find(
      (existingResourceScope: any) => existingResourceScope.name === s.name
    );
    let logtoScope =
      resourceScopeExists ||
      (await create(`resources/${resourceId}/scopes`, headers, s));

    if (resourceScopeExists) {
      await update(
        `resources/${resourceId}/scopes/${logtoScope.id}`,
        headers,
        s
      );
    }

    logtoScopes.push(logtoScope);
  }
  console.log(
    "*********************************************************************************\n"
  );

  // Create Roles
  console.log(
    "*********************************** ROLES **********************************************"
  );
  const fetchExistingRoles: Array<Object> = await fetchExisting(
    "roles",
    headers
  );
  let logtoRoles: Array<LogtoScope> = [];
  for (const r of roles) {
    const roleExists = fetchExistingRoles.find(
      (existingRole: any) => existingRole.name === r.name
    );
    let logtoRole = roleExists || (await create("roles", headers, r));

    if (roleExists) {
      await update(`roles/${logtoRole.id}`, headers, r);
    }

    logtoRoles.push(logtoRole);
  }
  console.log(
    "*********************************************************************************\n"
  );

  // Create Roles-scopes
  console.log(
    "*********************************** ROLES-SCOPES **********************************************"
  );
  let roleScopes: Array<{
    roleId: string;
    scopeId: string;
    scopeName: string;
  }> = logtoRoles.map((r, indx) => ({
    roleId: r.id,
    scopeId: logtoScopes[indx]["id"],
    scopeName: logtoScopes[indx]["name"],
  }));

  for (const rs of roleScopes) {
    const fetchExistingRoleScopes: Array<Object> = await fetchExisting(
      `roles/${rs.roleId}/scopes`,
      headers
    );
    const scopeExists = fetchExistingRoleScopes.find(
      (existingScope: any) => existingScope.name === rs.scopeName
    );

    scopeExists ||
      (await create(`roles/${rs.roleId}/scopes`, headers, {
        scopeIds: [rs.scopeId],
      }));
  }
  console.log(
    "*********************************************************************************\n"
  );

  let userRoles: Array<{ userId: string; roleIds: Array<string> }> = [];
  if (logtoAdminUser && logtoAdminUser["id"]) {
    // Create User-roles
    console.log(
      "*********************************** USER-ROLES **********************************************"
    );
    userRoles = [
      {
        userId: logtoAdminUser["id"],
        roleIds: logtoRoles.map((r) => r["id"]),
      },
    ];
    for (const ur of userRoles) {
      const fetchExistingUserRoles: Array<Object> = await fetchExisting(
        `users/${ur.userId}/roles`,
        headers
      );

      const missingRoleIDs = [];

      for (const roleId of ur.roleIds) {
        const userRoleExist = fetchExistingUserRoles.find(
          (existingRole: any) => existingRole.id === roleId
        );
        if (!userRoleExist) missingRoleIDs.push(roleId);
      }

      missingRoleIDs.length &&
        (await create(
          `users/${ur.userId}/roles`,
          headers,
          {
            roleIds: missingRoleIDs,
          },
          false
        ));
    }
    console.log(
      "*********************************************************************************\n"
    );
  }

  // Create Sign-in Experiences
  console.log(
    "*********************************** SIGN-IN EXPERIENCES **********************************************"
  );
  let signinExperience = {
    tenantId: "default",
    id: "default",
    branding: {
      favicon: `https://${process.env.CADDY__ALP__PUBLIC_FQDN}/portal/assets/favicon.ico`,
      logoUrl: `https://${process.env.CADDY__ALP__PUBLIC_FQDN}/portal/assets/d2e.svg`,
    },
    color: {
      primaryColor: "#000080",
      isDarkModeEnabled: false,
      darkPrimaryColor: "#0000B3",
    },
    customCss: `a[aria-label="Powered By Logto"] { display: none; }
img[alt="app logo"] { height: 80px; }
button[name="submit"]{ background: #000080 !important; }`,
    signInMode: "SignIn", //Disable user registration At Login screen
  };
  await update("sign-in-exp", headers, signinExperience);
  console.log(
    "*********************************************************************************\n"
  );

  if (process.env.LOGTO__CUSTOM_JWT) {
    // Create custom JWT
    console.log(
      "*********************************** CONFIGS **********************************************"
    );

    const payload = JSON.parse(process.env.LOGTO__CUSTOM_JWT);
    console.log("payload", payload);
    await upsert("configs/jwt-customizer/access-token", headers, payload);

    console.log(
      "*********************************************************************************\n"
    );
  }

  if (process.env.LOGTO__CONNECTOR_CONFIG){
    console.log(
      "*********************************** SOCIAL CONNECTOR **********************************************"
    );
    const connectorEnvConfig = JSON.parse(process.env.LOGTO__CONNECTOR_CONFIG);

    //Verify if existing connector exist
    const connectorDBConfig: any = await fetchExisting(`connectors/${connectorEnvConfig.id}`, headers)
    // console.log(`connectorDBConfig ${Object.keys(connectorDBConfig).length}`)
    if(connectorDBConfig && Object.keys(connectorDBConfig).length > 0) {
      //update
      const connectorCallbackId = connectorEnvConfig.id
      delete connectorEnvConfig.id
      delete connectorEnvConfig.connectorId
      await logto.patch(`connectors/${connectorCallbackId}`, headers, connectorEnvConfig)
      console.log("Social connector updated..")
    } else {
      // create
      await logto.post("connectors", headers, connectorEnvConfig)
      console.log("Social connector created..")
    }
    // Update Sign-in Experiences
    console.log(
      "*********************************** SIGN-IN EXPERIENCES **********************************************"
    );
    const signinExperienceSocialConnector: {
      branding: Object;
      color: Object;
      customCss: string;
      tenantId: string;
      id: string;
      signInMode: string;
      signUp: Object;
      signIn: Object;
      socialSignInConnectorTargets: string[];
    } = {
      ...signinExperience,
      signUp : { verify: false, password: true, identifiers: ["username"] },
      signIn: { methods: [{
                      "password": true, "identifier": "username",
                      "verificationCode": false, "isPasswordPrimary": true
                    }]
               },
      socialSignInConnectorTargets: ["azuread-alp"]
    };

    if (process.env.LOGTO__DISABLE_BASIC_AUTH === "true") {
      signinExperienceSocialConnector["signIn"] = { methods: [] }
      signinExperienceSocialConnector["signUp"] = { verify: false, password: false, identifiers: [] }
    } 

    await update("sign-in-exp", headers, signinExperienceSocialConnector);
    // console.log(`signinExperienceSocialConnector ${JSON.stringify(signinExperienceSocialConnector)}`)
    console.log(
      "*********************************************************************************\n"
    );
    console.log(
      "*********************************************************************************\n"
    );

  }

  console.log(
    "*********************************** SUMMARY **********************************\n"
  );

  const createdApps: Array<Object> = (
    await fetchExisting("applications", headers, false)
  ).filter((a: any) => apps.map((x) => x.name).includes(a.name));

  console.log(
    `Applications created: ${
      createdApps.length
    } \n Applications creation successful: ${createdApps.length == apps.length}`
  );

  const createdResources: Array<Object> = (
    await fetchExisting("resources", headers, false)
  ).filter((a: any) => resource.name === a.name);

  console.log(
    `Resources created: ${
      createdResources.length
    } \n Resources creation successful: ${createdResources.length == 1}`
  );

  const createdUsers: Array<Object> = (
    await fetchExisting("users", headers, false)
  ).filter((a: any) => user.username === a.username);

  console.log(
    `Users created: ${createdUsers.length} \n Users creation successful: ${
      createdUsers.length == 1
    }`
  );

  const createdScopes: Array<Object> = (
    await fetchExisting(`resources/${resourceId}/scopes`, headers, false)
  ).filter((s: any) => scopes.map((x) => x.name).includes(s.name));

  console.log(
    `Scopes created: ${createdScopes.length} \n Scopes creation successful: ${
      createdScopes.length == scopes.length
    }`
  );

  const createdRoles: Array<Object> = (
    await fetchExisting("roles", headers, false)
  ).filter((r: any) => roles.map((x) => x.name).includes(r.name));

  console.log(
    `Roles created: ${createdRoles.length} \n Roles creation successful: ${
      createdRoles.length == roles.length
    }`
  );

  const createdRoleScopes: Array<Object> = (
    await Promise.all(
      roleScopes.map((rs) =>
        fetchExisting(`roles/${rs.roleId}/scopes`, headers, false)
      )
    )
  ).filter((rs: any) => roleScopes.map((x) => x.scopeName === rs.name));

  console.log(
    `Roles-Scopes created: ${
      createdRoleScopes.length
    } \n Role-Scopes creation successful: ${
      createdRoleScopes.length == roleScopes.length
    }`
  );

  const createdUserRoles: Array<Object> = (
    await Promise.all(
      userRoles.map((ur) =>
        fetchExisting(`users/${ur.userId}/roles`, headers, false)
      )
    )
  )
    .filter((rs: any) => userRoles.map((x) => x.roleIds === rs.id))
    .flat();

  console.log(
    `Users-Roles created: ${
      createdUserRoles.length
    } \n User-Roles creation successful: ${
      createdUserRoles.length == userRoles.map((x) => x.roleIds).flat().length
    }`
  );
}

async function getDBClient() {
  const client = new pg.Client({
    user: process.env.PG__USER,
    password: process.env.PG__PASSWORD,
    host: process.env.PG__HOST,
    port: parseInt(process.env.PG__PORT),
    database: process.env.PG__DB_NAME,
    ssl: (() => {
      let ssl: any = JSON.parse(process.env.PG__SSL.toLowerCase());
      if (process.env.PG__CA_ROOT_CERT) {
        return {
          rejectUnauthorized: true,
          ca: process.env.PG__CA_ROOT_CERT,
        };
      }
      return ssl;
    })(),
  });
  await client.connect();
  return client;
}

async function seeding_alp_admin() {
  let logtoAdminApp = JSON.parse(process.env.LOGTO__ALP_ADMIN_APP) || {
    application: {},
    role: {},
  };
  let alpAdminApp: {
    id: string;
    name: string;
    description: string;
    secret: string;
  } = logtoAdminApp.application;
  let alpAdminRole = logtoAdminApp.role;

  const client = await getDBClient();

  const pg_schema = process.env.PG__SCHEMA
  let LOGTO__ADMIN_ROLE__ID = "jrmtgmb34iznwqdu5dhl1";
  let LOGTO__ADMIN_APP__ID = alpAdminApp.id;
  let LOGTO__ADMIN_APP_ROLE__ID = "34vzakbak1tp830d0s30o";
  let LOGTO__ADMIN_ROLE_SCOPE__ID = "da9va7i1g6ojghbph104e";
  let LOGTO__TENANT_ID = "default";

  console.log(
    "*********************************************************************************"
  );
  console.log(
    `Inserting ${alpAdminApp.name} application to applications table`
  );
  await queryPostgres(
    client,
    `INSERT INTO ${pg_schema}.applications(tenant_id, id, name, secret, description, type, oidc_client_metadata) \
    VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(id) \
    DO UPDATE SET secret = EXCLUDED.secret, oidc_client_metadata = EXCLUDED.oidc_client_metadata, custom_client_metadata = EXCLUDED.custom_client_metadata`,
    [
      LOGTO__TENANT_ID,
      LOGTO__ADMIN_APP__ID,
      `${alpAdminApp.name}`,
      `${alpAdminApp.secret}`,
      `${alpAdminApp.description}`,
      "MachineToMachine",
      '{  "redirectUris": [],  "postLogoutRedirectUris": [] }',
    ]
  );

  console.log(
    "*********************************************************************************\n"
  );
  console.log(`Inserting ${alpAdminRole.name} role to roles table`);
  await queryPostgres(
    client,
    `INSERT INTO ${pg_schema}.roles(tenant_id, id, name, description, type) 
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT(id) 
    DO NOTHING;`,
    [
      LOGTO__TENANT_ID,
      LOGTO__ADMIN_ROLE__ID,
      `${alpAdminRole.name}`,
      `${alpAdminRole.description}`,
      "MachineToMachine",
    ]
  );

  console.log(
    "*********************************************************************************"
  );
  console.log(
    `Adding role ${alpAdminRole.name} to application ${alpAdminApp.name}`
  );
  await queryPostgres(
    client,
    `INSERT INTO ${pg_schema}.applications_roles(tenant_id, id, application_id, role_id) 
    VALUES ($1, $2, $3, $4) ON CONFLICT(id) 
    DO NOTHING;`,
    [
      LOGTO__TENANT_ID,
      LOGTO__ADMIN_APP_ROLE__ID,
      LOGTO__ADMIN_APP__ID,
      LOGTO__ADMIN_ROLE__ID,
    ]
  );

  console.log(
    "*********************************************************************************\n"
  );
  console.log(`Adding scope "management-api-all" to role ${alpAdminRole.name}`);
  await queryPostgres(
    client,
    `INSERT INTO ${pg_schema}.roles_scopes(tenant_id, id, role_id, scope_id) 
    VALUES ($1, $2, $3, $4) ON CONFLICT(id) 
    DO NOTHING;`,
    [
      LOGTO__TENANT_ID,
      LOGTO__ADMIN_ROLE_SCOPE__ID,
      LOGTO__ADMIN_ROLE__ID,
      "management-api-all",
    ]
  );

  client.end();
}

async function seeding_apps() {
  console.log(
    "****************************SEEDING LOGTO APPS*****************************************************\n"
  );
  const client = await getDBClient();
  const pg_schema = process.env.PG__SCHEMA
  let envApps: Array<{
    name: string;
    id: string;
    secret: string;
    tenant_id: string;
    type: string;
    description: string;
    oidcClientMetadata?: string;
  }> = JSON.parse(process.env.LOGTO__CLIENT_APPS) || [];
  for (const envapp of envApps) {
    console.log(`Seeding app ${envapp.name} | id ${envapp.id}`);
    await queryPostgres(
      client,
      `INSERT INTO ${pg_schema}.applications(tenant_id, id, name, secret, description, type, oidc_client_metadata) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(id) 
      DO UPDATE SET secret = EXCLUDED.secret`,
      [
        "default",
        envapp.id,
        envapp.name,
        envapp.secret,
        envapp.description,
        envapp.type,
        envapp.oidcClientMetadata ??
          '{  "redirectUris": [],  "postLogoutRedirectUris": [] }',
      ]
    );
  }
  client.end();
}

(async () => {
  try {
    await seeding_alp_admin();
    await seeding_apps();
    await main();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
