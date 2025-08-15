//require("dotenv").config({ debug: process.env.DEBUG });
import winston from "winston";
import { readFileSync } from "fs";

const _env = process.env;

export const getProperties = (): any => {
  let properties;
  if (!properties) {
    const isProd = false;
    const k8sPathPrefix = "/var/alp-pg-management";
    properties = {
      postgres_connection_config: fetchSecretsAsPerEnvironment(
        "POSTGRES_CONNECTION_CONFIG",
        true
      ),
      postgres_superuser: fetchSecretsAsPerEnvironment("POSTGRES_SUPERUSER"),
      postgres_superuser_password: fetchSecretsAsPerEnvironment(
        "POSTGRES_SUPERUSER_PASSWORD"
      ),
      postgres_manage_config: fetchSecretsAsPerEnvironment(
        "POSTGRES_MANAGE_CONFIG",
        true
      ),
      postgres_manage_users: fetchSecretsAsPerEnvironment(
        "POSTGRES_MANAGE_USERS",
        true
      ),
      postgres_manage_grant_roles_users: fetchSecretsAsPerEnvironment(
        "POSTGRES_MANAGE_ROLES_USERS",
        true
      ),
      app_client_id: fetchSecretsAsPerEnvironment("CLIENT_ID"),
      app_client_secret: fetchSecretsAsPerEnvironment("CLIENT_SECRET"),
      tenant_id: fetchSecretsAsPerEnvironment("TENANT_ID"),
      postgres_publication_config: fetchSecretsAsPerEnvironment(
        "POSTGRES_PUBLICATION_CONFIG",
        true
      ),
      postgres_alter_extension_config: fetchSecretsAsPerEnvironment(
        "POSTGRES_ALTER_EXTENSION_CONFIG",
        true
      ),
      config_db_name: fetchSecretsAsPerEnvironment("POSTGRES_CONFIG_DB_NAME"),
    };
  }
  return properties;
};

const fetchSecretsAsPerEnvironment = (
  env_variable: string,
  isJson?: boolean
): string => {
  const isProd = _env.NODE_ENV === "production";
  const k8sPathPrefix = "/var/alp-pg-management";
  let env_value = isProd
    ? readFileSync(`${k8sPathPrefix}/${env_variable}`, "utf-8")
    : _env[env_variable]
    ? _env[env_variable]!
    : "";
  if (isJson) {
    env_value = JSON.parse(env_value);
  }
  return env_value;
};

export const getLogger = (): any => {
  //return console;
  let logger;
  if (!logger) {
    logger = winston.createLogger({
      level: _env.ALP_DB_LOGLEVEL,
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.colorize(),
            winston.format.printf((nfo) => {
              return `[${nfo.timestamp}] ${nfo.level}: ${nfo.message}`;
            })
          ),
        }),
      ],
    });
  }
  return logger;
};
