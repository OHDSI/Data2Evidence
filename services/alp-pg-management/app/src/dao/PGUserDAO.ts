import * as config from "../utils/config";

export default class PGUserDAO {
  private logger = config.getLogger();

  createUser = async (
    client: any,
    username: string,
    password: string,
    type: string
  ) => {
    const ifUserExists = await this.verifyIfUserExists(client, username);
    if (!ifUserExists) {
      await client.query(
        `CREATE ROLE ${username} NOSUPERUSER LOGIN ENCRYPTED PASSWORD '${password}'`
      );
      this.logger.info(`${type} User ${username} successfully created.`);
    } else {
      this.logger.info(`${type} User ${username} already exists!`);
    }
  };

  createUserWithCreateRolePrivilege = async (
    client: any,
    username: string,
    password: string
  ) => {
    const ifUserExists = await this.verifyIfUserExists(client, username);
    if (!ifUserExists) {
      await client.query(
        `CREATE ROLE ${username} NOSUPERUSER CREATEROLE LOGIN ENCRYPTED PASSWORD '${password}'`
      );
      this.logger.info(
        `User ${username} with CREATEROLE Privilege successfully created.`
      );
    } else {
      this.logger.info(`User ${username} already exists!`);
    }
  };

  createUserWithCreateDBPrivilege = async (
    client: any,
    username: string,
    password: string
  ) => {
    const ifUserExists = await this.verifyIfUserExists(client, username);
    if (!ifUserExists) {
      await client.query(
        `CREATE ROLE ${username} NOSUPERUSER CREATEDB LOGIN ENCRYPTED PASSWORD '${password}'`
      );
      this.logger.info(
        `User ${username} with CREATEDB Privilege successfully created.`
      );
    } else {
      this.logger.info(`User ${username} already exists!`);
    }
  };

  verifyIfUserExists = async (client: any, username: string) => {
    const result = await client.query(
      `	SELECT rolname FROM pg_roles WHERE rolname='${username}'`
    );
    return result.rows[0] && result.rows[0].rolname === username;
  };

  grantPrivileges = async (client: any, source: string, target: string) => {
    await client.query(`GRANT ${source} TO ${target}`);
  };

  revokePrivileges = async (client: any, source: string, target: string) => {
    await client.query(`REVOKE ${target} FROM ${source}`);
  };

  alterDatabaseOwner = async (
    client: any,
    databaseName: string,
    ownerUser: string
  ) => {
    await client.query(
      `ALTER DATABASE ${databaseName} OWNER TO "${ownerUser}"`
    );
    this.logger.info(
      `User ${ownerUser} successfully made Owner of ${databaseName} database`
    );
  };

  grantWritePrivilegesForSchema = async (
    client: any,
    schemaName: string,
    user: string
  ) => {
    try {
      //Write Access to current Objects
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ${schemaName} to ${user}`
      );
      await client.query(
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schemaName} to ${user}`
      );
      await client.query(
        `GRANT USAGE, UPDATE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} to ${user}`
      );
      this.logger.info(
        `${schemaName} schema granted Write privileges for current objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting write privileges for current objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }

    try {
      //Write Access to Future Objects
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO ${user}`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT USAGE, UPDATE, SELECT ON SEQUENCES TO ${user}`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT EXECUTE ON FUNCTIONS TO ${user}`
      );
      this.logger.info(
        `${schemaName} schema granted Write privileges for future objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting write privileges for future objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }
  };

  grantUsageSchemaPrivileges = async (
    client: any,
    schemaName: string,
    user: string
  ) => {
    try {
      //Access to schema and create objects within schema
      await client.query(`GRANT USAGE ON SCHEMA ${schemaName} to ${user}`);
    } catch (e: any) {
      this.logger.error(e.message);
    }
  };

  grantManagePrivilegesForSchema = async (
    client: any,
    schemaName: string,
    user: string,
    withGrantOption: boolean
  ) => {
    try {
      //Access to schema and create objects within schema
      await client.query(
        `GRANT CREATE, USAGE ON SCHEMA ${schemaName} to ${user} ${
          withGrantOption ? "with grant option" : ""
        }`
      );

      //Create/Write Access to current Objects
      await client.query(
        `GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} to ${user} WITH GRANT OPTION`
      );
      await client.query(
        `GRANT ALL ON ALL FUNCTIONS IN SCHEMA ${schemaName} to ${user} WITH GRANT OPTION`
      );
      await client.query(
        `GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} to ${user} WITH GRANT OPTION`
      );
      this.logger.info(
        `${schemaName} schema granted All privileges for current objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting all privileges for current objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }

    try {
      //Read Access to Future Objects
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON TABLES TO ${user} WITH GRANT OPTION`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON SEQUENCES TO ${user} WITH GRANT OPTION`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON FUNCTIONS TO ${user} WITH GRANT OPTION`
      );
      this.logger.info(
        `${schemaName} schema granted All privileges for future objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting all privileges for future objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }
  };

  grantReadPrivilegesForSchema = async (
    client: any,
    schemaName: string,
    user: string
  ) => {
    try {
      //Read Access to current Objects
      await client.query(
        `GRANT SELECT ON ALL TABLES IN SCHEMA ${schemaName} to ${user}`
      );
      await client.query(
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schemaName} to ${user}`
      );
      await client.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} to ${user}`
      );
      this.logger.info(
        `${schemaName} schema granted Read privileges for current objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting read privileges for current objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }

    try {
      //Read Access to Future Objects
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT SELECT ON TABLES TO ${user}`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT USAGE, SELECT ON SEQUENCES TO ${user}`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT EXECUTE ON FUNCTIONS TO ${user}`
      );
      this.logger.info(
        `${schemaName} schema granted Read privileges for future objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting read privileges for future objects in schema ${schemaName} to user ${user}`
      );
      this.logger.error(e.message);
    }
  };

  grantRoleToUser = async (client: any, role: string, user: string) => {
    try {
      await client.query(`GRANT "${role}" TO "${user}"`);
      this.logger.info(`Granted role ${role} to ${user}`);
    } catch (e: any) {
      this.logger.error(`Granted role ${role} to ${user}`);
      this.logger.error(e.message);
    }
  }

  grantCreatePrivilegesForDatabase = async (
    client: any,
    databaseName: string,
    user: string
  ) => {
    try {
      //Create Access to Future Objects
      await client.query(`GRANT CREATE ON DATABASE ${databaseName} TO ${user}`);

      this.logger.info(
        `${databaseName} database granted create privileges for future objects to ${user}`
      );
    } catch (e: any) {
      this.logger.error(
        `Error granting create privileges for future objects in database ${databaseName} to user ${user}`
      );
      this.logger.error(e.message);
    }
  };
}
