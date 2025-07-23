import PGDBDAO from "./dao/PGDBDAO";
import PGUserDAO from "./dao/PGUserDAO";
import * as config from "./utils/config";

type pgUsers = {
  reader: string;
  readerPassword: string;
  writer: string;
  writerPassword: string;
  manager: string;
  managerPassword: string;
  logtoManager?: string;
  logtoManagerPassword?: string;
};

export class App {
  private logger = config.getLogger();
  private properties = config.getProperties();
  private dbDao;
  private userDao;
  private nameValidationRegExp = new RegExp(/^[a-z0-9_-]+$/, "i");

  constructor() {
    this.logger = config.getLogger();
    this.dbDao = new PGDBDAO();
    this.userDao = new PGUserDAO();
  }

  getPGUsers(databaseName: string): pgUsers {
    const pgUsers: pgUsers =
      config.getProperties()["postgres_manage_users"][databaseName];

    if (!pgUsers?.reader || !pgUsers?.writer || !pgUsers?.manager) {
      throw new Error(
        `Users for ${databaseName} Not correctly configured. Database Creation Failed!`
      );
    }
    return pgUsers;
  }

  getUserName(user: string): string {
    if (!user) {
      throw new Error("Invalid User configured!");
    }
    return user;
  }

  getSchemaName(schema: string): string {
    return this.getValidNameInLowerCase(schema, "Schema");
  }

  getDatabaseName(schema: string): string {
    return this.getValidNameInLowerCase(schema, "Database");
  }

  //Used for Database or Schema name
  getValidNameInLowerCase(name: string, type: string): string {
    if (!name) {
      throw new Error(`Invalid ${type} configured!`);
    }

    //Important this step is above regex validation in the next step
    if (name.startsWith("+") || name.startsWith("-")) {
      name = name.substring(1, name.length);
    }

    if (!this.nameValidationRegExp.test(name)) {
      throw new Error(
        `${type} Name must only contain alphanumeric, dashes and underscores`
      );
    }
    return name.toLowerCase();
  }

  async grantRolesToUsers() {
    let client;
    const postgres_roles_users =
      config.getProperties()["postgres_manage_grant_roles_users"];

    if (postgres_roles_users && Object.keys(postgres_roles_users).length > 0) {
      try {
        const pg_superuser = {
          user: config.getProperties()["postgres_superuser"],
          password: config.getProperties()["postgres_superuser_password"],
        };

        //Switch to super user connection
        const pg_superuser_config = Object.assign(
          JSON.parse(
            JSON.stringify(config.getProperties()["postgres_connection_config"])
          ),
          pg_superuser
        );
        const client = await this.dbDao.openConnection(pg_superuser_config);

        //Grant role to user
        for (const role in postgres_roles_users) {
          for (const user of postgres_roles_users[role]) {
            await this.userDao.grantRoleToUser(client, role, user);
          }
        }
        await this.dbDao.closeConnection(client);
      } catch (e: any) {
        this.logger.error(e.message);
        await this.dbDao.closeConnection(client);
        throw e;
      }
    }
  }

  async createUsers(databaseName: string) {
    let client;
    try {
      const pg_superuser = {
        user: config.getProperties()["postgres_superuser"],
        password: config.getProperties()["postgres_superuser_password"],
      };

      //Switch to super user connection
      const pg_superuser_config = Object.assign(
        JSON.parse(
          JSON.stringify(config.getProperties()["postgres_connection_config"])
        ),
        pg_superuser
      );
      let pg_owner = {
        user: this.getUserName(
          config.getProperties()["postgres_connection_config"]["user"]
        ),
        password:
          config.getProperties()["postgres_connection_config"]["password"],
      };
      const pgUsers: pgUsers = this.getPGUsers(databaseName);

      const client = await this.dbDao.openConnection(pg_superuser_config);

      await this.userDao.createUserWithCreateDBPrivilege(
        client,
        pg_owner.user,
        pg_owner.password
      );
      await this.userDao.createUser(
        client,
        pgUsers.reader,
        pgUsers.readerPassword,
        "Reader"
      );
      await this.userDao.createUser(
        client,
        pgUsers.writer,
        pgUsers.writerPassword,
        "Writer"
      );
      await this.userDao.createUser(
        client,
        pgUsers.manager,
        pgUsers.managerPassword,
        "Manager"
      );

      if (
        pgUsers.logtoManager !== undefined &&
        pgUsers.logtoManagerPassword !== undefined
      ) {
        await this.userDao.createUserWithCreateRolePrivilege(
          client,
          pgUsers.logtoManager,
          pgUsers.logtoManagerPassword
        );
      }

      // Create Supabase roles directly with a separate function
      await this.createSupabaseRoles(client);

      await this.dbDao.closeConnection(client);
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      throw e;
    }
  }

  async createSupabaseRoles(client: any) {
    this.logger.info("Creating Supabase roles...");

    try {
      // Create anon role
      const anonRoleExists = await this.userDao.verifyIfUserExists(client, "anon");
      if (!anonRoleExists) {
        await client.query(`CREATE ROLE anon NOLOGIN INHERIT;`);
        this.logger.info("Created anon role successfully");
      } else {
        this.logger.info("anon role already exists");
      }
  
      // Create authenticated role
      const authenticatedRoleExists = await this.userDao.verifyIfUserExists(client, "authenticated");
      if (!authenticatedRoleExists) {
        await client.query(`CREATE ROLE authenticated NOLOGIN INHERIT;`);
        this.logger.info("Created authenticated role successfully");
      } else {
        this.logger.info("authenticated role already exists");
      }
  
      // Create service_role role
      const serviceRoleExists = await this.userDao.verifyIfUserExists(client, "service_role");
      if (!serviceRoleExists) {
        await client.query(`CREATE ROLE service_role NOLOGIN INHERIT BYPASSRLS;`);
        this.logger.info("Created service_role role successfully");
      } else {
        this.logger.info("service_role role already exists");
      }
  
      // Verify roles were created
      const result = await client.query(`
        SELECT rolname FROM pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role')
      `);

      const existingRoles = result.rows.map((row: any) => row.rolname);
      this.logger.info(`Found Supabase roles: ${existingRoles.join(", ")}`);

      // Grant roles to users
      const pgUsers = this.getPGUsers(this.getDatabaseName(config.getProperties()["config_db_name"]));

      if (existingRoles.includes("service_role")) {
        await client.query(`GRANT service_role TO "${pgUsers.manager}"`);
        this.logger.info(
          `Granted service_role to ${pgUsers.manager}`
        );
      }

      if (existingRoles.includes("anon")) {
        await client.query(`GRANT anon TO "${pgUsers.reader}"`);
        this.logger.info(`Granted anon to ${pgUsers.reader}`);
      }

      if (existingRoles.includes("authenticated")) {
        await client.query(`GRANT authenticated TO "${pgUsers.writer}"`);
        this.logger.info(`Granted authenticated to ${pgUsers.writer}`);
      }
    } catch (error: any) {
      this.logger.error(`Error in Supabase role creation: ${error.message}`);
    }
  }

  async createDatabase(databaseName: string) {
    let client;
    try {
      await this.createUsers(databaseName);

      //Switch to super user connection only for database creation
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      const client = await this.dbDao.openConnection(pg_owneruser_config);
      const ifDatabaseExists = await this.dbDao.verifyIfDatabaseExists(
        client,
        databaseName
      );

      if (ifDatabaseExists) {
        this.logger.info(
          `${databaseName} Database Already exists! Skipping the rest of the operations such as create users`
        );
      } else {
        await this.dbDao.createDatabase(client, databaseName);
      }

      const pg_owneruserWithoutAtSuffix = this.getUserName(
        pg_owneruser_config.user
      );
      await this.userDao.alterDatabaseOwner(
        client,
        databaseName,
        pg_owneruserWithoutAtSuffix
      );

      await this.dbDao.closeConnection(client);
      return true;
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      return false;
    }
  }

  async createSchema(databaseName: string, schemaName: string) {
    let client;
    try {
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      const pgUsers: pgUsers = this.getPGUsers(databaseName);
      //Connect with existing database and itsowner user
      let client = await this.dbDao.openConnection({
        ...pg_owneruser_config,
        database: databaseName,
      });

      try {
        await this.dbDao.createSchema(client, databaseName, schemaName);
      } catch (e: any) {
        this.logger.error(e.message);
        await this.dbDao.closeConnection(client);

        //Reattempt, due to the old databases created by SRE. Manager User is the owner instead of alp_owner
        const pg_manage_user = {
          user: pgUsers.manager,
          password: pgUsers.managerPassword,
        };
        const pg_manageruser_config: any = {
          ...pg_owneruser_config,
          database: databaseName,
          user: pg_manage_user.user,
          password: pg_manage_user.password,
        };
        client = await this.dbDao.openConnection({
          ...pg_manageruser_config,
          database: databaseName,
        });
        await this.dbDao.createSchema(client, databaseName, schemaName);
      }

      //Grant Manage & Usage Privileges
      await this.userDao.grantManagePrivilegesForSchema(
        client,
        schemaName,
        pgUsers.manager,
        false
      );

      if (
        pgUsers.logtoManager !== undefined &&
        pgUsers.logtoManagerPassword !== undefined
      ) {
        await this.userDao.grantManagePrivilegesForSchema(
          client,
          schemaName,
          pgUsers.logtoManager,
          true
        );
      }

      await this.userDao.grantUsageSchemaPrivileges(
        client,
        schemaName,
        pgUsers.reader
      );
      await this.userDao.grantUsageSchemaPrivileges(
        client,
        schemaName,
        pgUsers.writer
      );
      await this.dbDao.closeConnection(client);

      //Grant Read & Write Privileges
      await this.grantReadWritePrivileges(databaseName, schemaName);

      return true;
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      return false;
    }
  }

  async alterTableReplica(databaseName: string, schemaName: string) {
    let client;

    try {
      //Switch to super user connection only for database creation
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      //Connect with existing database and itsowner user
      let client = await this.dbDao.openConnection({
        ...pg_owneruser_config,
        database: databaseName,
      });

      const tablesWithNoPK = await this.dbDao.getTablesWithNoPK(
        client,
        schemaName
      );

      for (const table of tablesWithNoPK) {
        await this.dbDao.alterReplicaIdentity(client, table);
      }
      this.logger.info(
        `Successfully altered table replica identity to full for tables with no primary key in ${schemaName} schema!`
      );
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      return false;
    }
  }

  async createPublication(
    databaseName: string,
    schemaName: string,
    publicationName: string
  ) {
    let client;

    try {
      //Switch to super user connection only for database creation
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      //Connect with existing database and itsowner user
      let client = await this.dbDao.openConnection({
        ...pg_owneruser_config,
        database: databaseName,
      });

      const ifPublicationExists = await this.dbDao.verifyIfPublicationExists(
        client,
        publicationName
      );

      if (ifPublicationExists) {
        this.logger.info(`${publicationName} publication already exists!`);
      } else {
        await this.dbDao.createPublication(
          client,
          databaseName,
          schemaName,
          publicationName
        );
      }
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      return false;
    }
  }

  async grantReadWritePrivileges(databaseName: string, schemaName: string) {
    let client;
    try {
      const pgUsers: pgUsers = this.getPGUsers(databaseName);
      const pg_config = config.getProperties()["postgres_connection_config"];
      const pg_manage_user = {
        user: pgUsers.manager,
        password: pgUsers.managerPassword,
      };
      //Switch to super user connection only for database creation
      const pg_manageuser_config = Object.assign(
        JSON.parse(JSON.stringify(pg_config)),
        pg_manage_user
      );
      const client = await this.dbDao.openConnection({
        ...pg_manageuser_config,
        database: databaseName,
      });

      await this.userDao.grantReadPrivilegesForSchema(
        client,
        schemaName,
        pgUsers.reader
      );
      await this.userDao.grantWritePrivilegesForSchema(
        client,
        schemaName,
        pgUsers.writer
      );

      await this.dbDao.closeConnection(client);
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      throw e;
    }
  }

  async grantCreatePrivilegesForDatabase(databaseName: string, user: string) {
    let client;

    try {
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      const client = await this.dbDao.openConnection(pg_owneruser_config);

      await this.userDao.grantCreatePrivilegesForDatabase(
        client,
        databaseName,
        user
      );
      await this.dbDao.closeConnection(client);
      return true;
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      return false;
    }
  }

  async start() {
    const pg_management_config =
      config.getProperties()["postgres_manage_config"];
    const databases = pg_management_config["databases"];
    for (let database of Object.keys(databases)) {
      if (database.startsWith("+")) {
        //+ indicating creation scenarios
        const databaseName = this.getDatabaseName(database);
        const pgUsers = this.getPGUsers(databaseName);

        await this.createDatabase(databaseName);
        await this.grantCreatePrivilegesForDatabase(
          databaseName,
          pgUsers.manager
        );

        if (
          pgUsers.logtoManager !== undefined &&
          pgUsers.logtoManagerPassword !== undefined
        ) {
          await this.grantCreatePrivilegesForDatabase(
            databaseName,
            pgUsers.logtoManager
          );
        }

        const schemas = databases[database]["schemas"];
        for (let schema of Object.keys(schemas)) {
          if (schema.startsWith("+")) {
            //+ indicating creation scenarios
            await this.createSchema(databaseName, this.getSchemaName(schema));
          }
        }
      }

      // create publication if database in POSTGRES_PUBLICATION_CONFIG
      // const pg_publication_config =
      //   config.getProperties()["postgres_publication_config"];
      // const databaseName = this.getDatabaseName(database);
      // const dbPublications =
      //   pg_publication_config["databases"][`+${databaseName}`];

      // if (dbPublications !== undefined) {
      //   for (let publicationConig of Object.keys(dbPublications)) {
      //     if (publicationConig.startsWith("+")) {
      //       //+ indicating creation scenarios
      //       const { schema, publication } = dbPublications[publicationConig];
      //       await this.createPublication(databaseName, schema, publication);
      //       this.logger.info("Altering table replicas...");
      //       await this.alterTableReplica(databaseName, schema);
      //     }
      //   }
      // } else {
      //   this.logger.info(
      //     `No publication to create for database ${databaseName}`
      //   );
      // }
    }
    this.logger.info("Postgres Automation tasks completed.");
    process.exit(0);
  }
}

new App().start();
