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
      const anonRoleExists = await this.userDao.verifyIfUserExists(
        client,
        "anon"
      );
      if (!anonRoleExists) {
        await client.query(`CREATE ROLE anon NOLOGIN INHERIT;`);
        this.logger.info("Created anon role successfully");
      } else {
        this.logger.info("anon role already exists");
      }

      // Create authenticated role
      const authenticatedRoleExists = await this.userDao.verifyIfUserExists(
        client,
        "authenticated"
      );
      if (!authenticatedRoleExists) {
        await client.query(`CREATE ROLE authenticated NOLOGIN INHERIT;`);
        this.logger.info("Created authenticated role successfully");
      } else {
        this.logger.info("authenticated role already exists");
      }

      // Create service_role role
      const serviceRoleExists = await this.userDao.verifyIfUserExists(
        client,
        "service_role"
      );
      if (!serviceRoleExists) {
        // No BYPASSRLS: setting that attribute requires superuser, which
        // managed Postgres (Azure Flexible Server included) never grants --
        // even to a role that holds BYPASSRLS itself. Requesting it made this
        // statement fail with "must be superuser to change bypassrls
        // attribute" on every greenfield install, and because the surrounding
        // catch only logged, pg-mgmt-init still exited 0 while service_role
        // was missing and the GRANTs below were skipped. The failure then
        // surfaced in the next init container as the misleading
        // `role "service_role" does not exist`.
        //
        // Reachability of storage.buckets is provided by the
        // d2e_service_role_all policy in the d2e-core chart instead.
        await client.query(`CREATE ROLE service_role NOLOGIN INHERIT;`);
        this.logger.info("Created service_role role successfully");
      } else {
        this.logger.info("service_role role already exists");
      }

      // Create supabase_admin role
      const supabaseAdminExists = await this.userDao.verifyIfUserExists(
        client,
        "supabase_admin"
      );
      if (!supabaseAdminExists) {
        // trex's V1__initial_schema creates supabase_admin WITH ...
        // REPLICATION, which is superuser-only on managed Postgres. That
        // aborts V1, so trexdb is never created and trex dies on boot with
        // "trexdb.kek_wrapped_dek not present". V1 is checksum-verified and
        // already applied in existing deployments, so it cannot be edited --
        // pre-creating the role here makes V1's own IF NOT EXISTS guard skip
        // the failing statement.
        //
        // No REPLICATION: V5__drop_realtime_admin drops this role and the
        // _realtime schema a few migrations later, because native realtime
        // replaced the external container. Nothing ever replicates as it.
        await client.query(`CREATE ROLE supabase_admin NOLOGIN;`);
        this.logger.info("Created supabase_admin role successfully");
      } else {
        this.logger.info("supabase_admin role already exists");
      }

      // Verify roles were created
      const result = await client.query(`
        SELECT rolname FROM pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role', 'supabase_admin')
      `);

      const existingRoles = result.rows.map((row: any) => row.rolname);
      this.logger.info(`Found Supabase roles: ${existingRoles.join(", ")}`);

      // Grant roles to users
      const pgUsers = this.getPGUsers(
        this.getDatabaseName(config.getProperties()["config_db_name"])
      );

      if (existingRoles.includes("service_role")) {
        await client.query(`GRANT service_role TO "${pgUsers.manager}"`);
        this.logger.info(`Granted service_role to ${pgUsers.manager}`);
      }

      if (existingRoles.includes("supabase_admin")) {
        // V1 creates the _realtime schema AUTHORIZATION supabase_admin, which
        // needs membership in the role rather than mere CREATEROLE. Postgres 15
        // gives the creator no membership, so grant it to the manager and to
        // this connection, which is the superuser that also runs V1.
        await client.query(`GRANT supabase_admin TO "${pgUsers.manager}"`);
        await client.query(`GRANT supabase_admin TO CURRENT_USER`);
        this.logger.info(`Granted supabase_admin to ${pgUsers.manager}`);
      }

      if (existingRoles.includes("anon")) {
        await client.query(`GRANT anon TO "${pgUsers.reader}"`);
        this.logger.info(`Granted anon to ${pgUsers.reader}`);
      }

      if (existingRoles.includes("authenticated")) {
        await client.query(`GRANT authenticated TO "${pgUsers.writer}"`);
        this.logger.info(`Granted authenticated to ${pgUsers.writer}`);
      }

      // Postgres 15 stopped granting CREATE on schema public to PUBLIC. logto's
      // roles.sql creates public.check_role_type -- hardcoded to public, not to
      // its own schema -- so on a fresh database logto-seed-init dies with
      // "permission denied for schema public", and the storage post-init
      // likewise creates public.objects.
      //
      // public is owned by the platform admin role (azure_pg_admin on Azure),
      // so these grants only take effect when POSTGRES_SUPERUSER is a member of
      // it. A non-member gets "WARNING: no privileges were granted for public"
      // and Postgres still reports success, so verify afterwards -- the symptom
      // otherwise surfaces several init containers later as an unrelated error.
      const publicCreators = [pgUsers.manager, pgUsers.logtoManager].filter(
        (u): u is string => !!u
      );
      const publicUsers = [
        pgUsers.writer,
        ...existingRoles.filter((r: string) => r !== "supabase_admin"),
      ].filter((u): u is string => !!u);

      for (const user of publicCreators) {
        await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO "${user}"`);
      }
      for (const user of publicUsers) {
        await client.query(`GRANT USAGE ON SCHEMA public TO "${user}"`);
      }

      for (const user of publicCreators) {
        const check = await client.query(
          `SELECT has_schema_privilege($1, 'public', 'CREATE') AS granted`,
          [user]
        );
        if (check.rows[0]?.granted) {
          this.logger.info(`Granted CREATE on schema public to ${user}`);
        } else {
          this.logger.error(
            `Could not grant CREATE on schema public to ${user}. Schema public ` +
              `is owned by the platform admin role, so the connecting user must ` +
              `be a member of it (on Azure: GRANT azure_pg_admin TO <superuser>). ` +
              `Without this, logto seeding fails with "permission denied for schema public".`
          );
        }
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

  async alterExtensionSchema(databaseName: string, alterExtensionConfig: any) {
    let client;

    try {
      const pg_owneruser_config =
        config.getProperties()["postgres_connection_config"];
      const client = await this.dbDao.openConnection(pg_owneruser_config);

      await this.dbDao.alterExtensionSchema(
        client,
        alterExtensionConfig[databaseName].schema,
        alterExtensionConfig[databaseName].extension
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

        // set extension if schema and database in postgres_alter_extension_config
        const alter_extension_config =
          config.getProperties()["postgres_alter_extension_config"][
            "databases"
          ];

        if (
          alter_extension_config &&
          Object.prototype.hasOwnProperty.call(
            alter_extension_config,
            databaseName
          )
        ) {
          await this.alterExtensionSchema(databaseName, alter_extension_config);
        }
      }
    }
    this.logger.info("Postgres Automation tasks completed.");
    process.exit(0);
  }
}

new App().start();
