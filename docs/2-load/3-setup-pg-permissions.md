# Postgres `alpdev_pg` database and users initialization

- Postgres users to be created

  - **postgres_tenant_read_user**
  - **postgres_tenant_admin_user**

- For added security, the above Database Credentials are not stored in plain text with the .env file but encrypted within the database
- Please set the following environment variables with random passwords and keep a note

```bash
POSTGRES_TENANT_READ_PASSWORD_PLAIN=<POSTGRES_TENANT_READ_PASSWORD_PLAIN>
POSTGRES_TENANT_ADMIN_PASSWORD_PLAIN=<POSTGRES_TENANT_ADMIN_PASSWORD_PLAIN>
```

hint:

- the following command generates suitable random secrets on macos or linux

```bash
LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 30
```

## Note

If using the postgres docker container please run the following commands as is, otherwise subselect the postgres part of the command (i.e, excluding docker tty) to be executed on the other standalone postgres database.

## Create read role

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "CREATE ROLE postgres_tenant_read_user NOSUPERUSER LOGIN ENCRYPTED PASSWORD '${POSTGRES_TENANT_READ_PASSWORD_PLAIN}';"
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "CREATE ROLE postgres_tenant_read_role;"
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "GRANT postgres_tenant_read_role to postgres_tenant_read_user;"
```

- Expected successful response:
  > CREATE ROLE

## Troubleshooting

- If you create the role with a blank password because ${POSTGRES_TENANT_READ_PASSWORD_PLAIN} is not set, then delete the role & create again with the following command:
  > docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "DROP ROLE postgres_tenant_read_user;"

## Create admin role

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "CREATE ROLE postgres_tenant_admin_user NOSUPERUSER LOGIN ENCRYPTED PASSWORD '${POSTGRES_TENANT_ADMIN_PASSWORD_PLAIN}';"
```

- Expected successful response:
  > CREATE ROLE

## Create database `alpdev_pg`

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -c "CREATE DATABASE alpdev_pg;"
```

- Expected successful response:
  > CREATE DATABASE

## Alter admin role for schema creation

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -d alpdev_pg -c "ALTER ROLE postgres_tenant_admin_user CREATEROLE NOSUPERUSER NOCREATEDB NOREPLICATION NOBYPASSRLS;"
```

- Expected successful response:
  > ALTER ROLE

## Grant read permission for future objects to read role

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -d alpdev_pg -c "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO postgres_tenant_read_user; ALTER DEFAULT PRIVILEGES GRANT USAGE, SELECT ON SEQUENCES TO postgres_tenant_read_user; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO postgres_tenant_read_user;"
```

- Expected successful response:
  > ALTER DEFAULT PRIVILEGES
  >
  > ALTER DEFAULT PRIVILEGES
  >
  > ALTER DEFAULT PRIVILEGES

## Grant admin permission for future objects to admin role

- Run the following command:

```bash
docker exec alp-minerva-postgres-1 psql -h localhost -U postgres -p 5432 -d alpdev_pg -c "GRANT CREATE ON DATABASE alpdev_pg TO postgres_tenant_admin_user WITH GRANT OPTION; ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO postgres_tenant_admin_user WITH GRANT OPTION; ALTER DEFAULT PRIVILEGES GRANT ALL ON SEQUENCES TO postgres_tenant_admin_user WITH GRANT OPTION; ALTER DEFAULT PRIVILEGES GRANT ALL ON FUNCTIONS TO postgres_tenant_admin_user WITH GRANT OPTION;"
```

- Expected successful response:
  > GRANT
  >
  > ALTER DEFAULT PRIVILEGES
  >
  > ALTER DEFAULT PRIVILEGES
  >
  > ALTER DEFAULT PRIVILEGES
