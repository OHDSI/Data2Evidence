# ALP User Management

Manage users, roles and permission for accessing tenant and study.

### Tech stack

- [Express](https://expressjs.com/)
- [Knex](http://knexjs.org/)

### Database

### Add new migration script
- To add a new migration script, run
```
yarn add-migration <migration_name_in_snake_case>
```
- It  creates a file with 2 functions `up` and `down`. Write the migration script in `up` and the rollback script in `down` functions.
- For local dev:
  - Run `yarn compile` to update the `target` folder
  - Restart the system services docker

### API's Supported

#### User

- Get all users:
  ```
  GET <process.env.USER_MGMT__PATH>/user/
  ```
- Get user by ID:
  ```
  GET <process.env.USER_MGMT__PATH>/user/:id
  ```
- Get user by email:
  ```
  GET <process.env.USER_MGMT__PATH>/user/email/:email
  ```
- Create user:
  ```
  POST <process.env.USER_MGMT__PATH>/user/
  {
    "id": "<azure_b2c_user_id>",
    "email": "<azure_b2c_email>"
  }
  ```
- Delete user by ID:
  ```
  DELETE <process.env.USER_MGMT__PATH>/user/:id
  ```

#### Group

- Get all groups:
  ```
  GET <process.env.USER_MGMT__PATH>/group/
  ```
- Get group by ID:
  ```
  GET <process.env.USER_MGMT__PATH>/group/:id
  ```
- Get group by study and role (e.g. eCov Researcher):
  ```
  GET <process.env.USER_MGMT__PATH>/group/study/:studyId/role/:role
  ```
- Get group by tenant and role (e.g. Data4Life Tenant Admin):
  ```
  GET  <process.env.USER_MGMT__PATH>/group/tenant/:tenantId/role/:role
  ```
- Create group
  ```
  POST <process.env.USER_MGMT__PATH>/group/
  {
    "role": "<role>",
    "tenantId": "<tenant_uuid>",
    "studyId": "<study_uuid>"
  }
  ```
- Delete group
  ```
  DELETE <process.env.USER_MGMT__PATH>/group/:id
  ```
- Clean up groups due to deleted tenant or study
  ```
  POST <process.env.USER_MGMT__PATH>/group/cleanup/
  ```

#### User Group

- Get user groups by user ID with the roles and groups transformed in a specific format:
  ```
  GET <process.env.USER_MGMT__PATH>/user-group/list/
  {
    "userId": "<user_uuid>",
    "tenantId": "<optional_tenant_uuid>",
    "system": "<optional_system_name>"
  }
  ```
- Get user groups
  ```
  GET <process.env.USER_MGMT__PATH>/user-group/
    ?email=<optional_email>
    &tenantId=<optional_tenant_uuid>
    &studyId=<optional_study_uuid>
    &system=<optional_system_name>
    &role=<optional_role>
  ```
- Get user overview information
  ```
  GET <process.env.USER_MGMT__PATH>/user-group/overview
    ?tenantId=<optional_tenant_uuid>
  ```
- Register user to tenant as tenant viewer (default role)
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/register-to-tenant/
  {
    "tenantId": "<tenant_uuid>",
    "emails": ["<email_1>", "<email_2>"]
  }
  ```
- Register user to tenant as per given roles
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/register-tenant-roles/
  {
    "tenantId": "<tenant_uuid>",
    "userId": "<user_uuid>",
    "roles": ["<TENANT_ADMIN>"]
  }
  ```
- Register user to study as per given roles
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/register-study-roles/
  {
    "tenantId": "<tenant_uuid>",
    "studyId": "<study_uuid>",
    "userIds": ["<user_uuid_1>", "<user_uuid_2>"],
    "roles": ["<RESEARCHER>", "<STUDY_MGR>"]
  }
  ```
- Withdraw user from tenant as per given roles
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/withdraw-tenant-roles/
  {
    "tenantId": "<tenant_uuid>",
    "userId": "<user_uuid>",
    "roles": ["<TENANT_ADMIN>"]
  }
  ```
- Withdraw user from study as per given roles
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/register-study-roles/
  {
    "studyId": "<study_uuid>",
    "userIds": ["<user_uuid_1>", "<user_uuid_2>"],
    "roles": ["<RESEARCHER>", "<STUDY_MGR>"]
  }
  ```
- Withdraw user from tenant
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/withdraw-tenant-roles/
  {
    "tenantId": "<tenant_uuid>",
    "userId": "<user_uuid>",
    "roles": ["<TENANT_ADMIN>"]
  }
  ```
- Get if user belong to a role
  ```
  POST <process.env.USER_MGMT__PATH>/user-group/status/:role
  {
    "userId": "<user_uuid>"
  }
  ```



