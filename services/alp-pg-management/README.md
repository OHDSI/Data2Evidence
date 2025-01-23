# Switch to Microsft Entra Service principal for Azure Postgres Flex

## Create an App registration and Assign a role

1. Create an [App registration](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal) and a `client secret`.
2. Assign a `Reader` role to the App on the resource group assoicated with Postgres Flex
	- UI (https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#assign-a-role-to-the-application) to the App
	OR
	- CLI
	```bash
	APP_ID=<FILL>
	SUBSCRIPTION_ID=<FILL>
	POSTGRES_RESOURCE_GROUP_NAME=<FILL>
	az role assignment create --assignee "${APP_ID}" \
	--role "Reader" \
	--scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${POSTGRES_RESOURCE_GROUP_NAME}"
	```

## Assign the App to Azure group
Navigate to an already created Azure group and add the App to the group. It will be added as type `Service Principal`

## Assign Admin role to Azure group in Postgres Flex
1. Login as an existing admin into Azure postgres flex
2. Fill the placeholder `<>` and Run the following command `select * from pg_catalog.pgaadauth_create_principal('<AZURE_GROUP_DISPLAY_NAME>', true, false);`

## Update the ENV for pg-mgmt service

1. In env `POSTGRES_CONNECTION_CONFIG` 
	- Remove `password` property
	- Set the value to `user` property as the **<AZURE_GROUP_DISPLAY_NAME>** assigned admin role in the previous step.
	- Set the value to `database` to a an existing default database such as `postgres`. Otherwise Postgres flex will complain.
	- Add property `"ssl":true`
2. Set value for following envs
	- `POSTGRES_SUPERUSER`: <AZURE_GROUP_DISPLAY_NAME>
	- `POSTGRES_SUPERUSER_PASSWORD`: <NOVALUE> (Leave it empty)
	- `CLIENT_ID`: <APP_ID>
	- `CLIENT_SECRET`: <CLIENT_SECRET>
	- `TENANT_ID`: <TENANT_ID>
