import crypto from "crypto";
import PGUserDAO from "./dao/PGUserDAO";
import PGDBDAO from "./dao/PGDBDAO";
import * as config from "./utils/config";

type pgUsers = {
  reader: string;
  readerPassword: string;
  writer: string;
  writerPassword: string;
  manager: string;
  managerPassword: string;
  logtoManager: string;
  logtoManagerPassword: string;
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
    const postgres_roles_users = config.getProperties()["postgres_manage_grant_roles_users"]

    if (postgres_roles_users && Object.keys(postgres_roles_users).length > 0){
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
            await this.userDao.grantRoleToUser(client, role, user)
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
      await this.userDao.createUserWithCreateRolePrivilege(
        client,
        pgUsers.logtoManager,
        pgUsers.logtoManagerPassword
      );

      await this.dbDao.closeConnection(client);
    } catch (e: any) {
      this.logger.error(e.message);
      await this.dbDao.closeConnection(client);
      throw e;
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
      await this.userDao.grantManagePrivilegesForSchema(
        client,
        schemaName,
        pgUsers.logtoManager,
        true
      );
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

  async start() {
    const pg_management_config =
      config.getProperties()["postgres_manage_config"];
    const databases = pg_management_config["databases"];
    for (let database of Object.keys(databases)) {
      if (database.startsWith("+")) {
        //+ indicating creation scenarios
        const databaseName = this.getDatabaseName(database);
        await this.createDatabase(databaseName);
        await this.grantCreatePrivilegesForDatabase(
          databaseName,
          this.getPGUsers(databaseName).manager
        );
        await this.grantCreatePrivilegesForDatabase(
          databaseName,
          this.getPGUsers(databaseName).logtoManager
        );
        const schemas = databases[database]["schemas"];
        for (let schema of Object.keys(schemas)) {
          if (schema.startsWith("+")) {
            //+ indicating creation scenarios
            await this.createSchema(databaseName, this.getSchemaName(schema));
          }
        }
      }
    }
    this.logger.info("Postgres Automation tasks completed.");
    process.exit(0);
  }
}

new App().start();
