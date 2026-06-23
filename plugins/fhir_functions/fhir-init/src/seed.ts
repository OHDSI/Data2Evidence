import { DbCredentialsAPI } from "./api/DbCredentialsAPI";
import { env } from "./env";
import { DbCredentialProcessor } from "./utils/credentialProcessor";
import { AUTHENTICATION_MODES, IDbCreateDto, IDbCredential } from "./utils/type"

export async function seed(): Promise<void> {
  try {
    let logger = console;
    logger.info("Adding FHIR database (trex pgwire)");

    const dbCredentialsAPI = new DbCredentialsAPI();
    await dbCredentialsAPI.getClientCredentialsToken()

    const dbList = await dbCredentialsAPI.getDbList();
    const exist = dbList.find((db) => db.code === env.FHIR_DATABASE_CODE);
    if (exist && exist.dialect === "trex") {
      logger.info(`Database exist: ${JSON.stringify(exist)}`);
      return;
    }
    if (exist) {
      // Stale entry from the pre-trex FHIR setup (dialect "postgres");
      // POST upserts via ON CONFLICT, replacing it with the trex pgwire entry.
      logger.info(`Database ${env.FHIR_DATABASE_CODE} exists with dialect "${exist.dialect}" — updating to trex`);
    }
    const dbCredentialProcessor = new DbCredentialProcessor();
    let credentials: IDbCredential;
    let encryptedPasswords: IDbCredential[] = [];
    credentials = {
      username: env.TREX_SQL_USER,
      password: env.TREX_SQL_PASSWORD,
      serviceScope: "Internal",
      salt: "",
      userScope: "Admin"
    }
    encryptedPasswords.push(await dbCredentialProcessor.encryptDbCredential(credentials))

    credentials = {
      username: env.TREX_SQL_USER,
      password: env.TREX_SQL_PASSWORD,
      serviceScope: "Internal",
      salt: "",
      userScope: "Read",
    }
    encryptedPasswords.push(await dbCredentialProcessor.encryptDbCredential(credentials))

    const db: IDbCreateDto = {
      name: env.FHIR_DB_NAME,
      code: env.FHIR_DATABASE_CODE,
      vocabSchemas: [],
      credentials: encryptedPasswords,
      host: env.TREX_SQL_HOST,
      port: Number(env.TREX_SQL_PORT),
      dialect: "trex",
      authenticationMode: AUTHENTICATION_MODES.PASSWORD,
      extra: {
        Internal: {
          "queryTimeout": 60000,
          "statementTimeout": 60000,
        }
      }
    };
    const result = await dbCredentialsAPI.createDb(db);
    logger.info(`Database added: ${JSON.stringify(result)}`);
    return result;
  } catch (error: any) {
    console.error("Error seeding database:", error.response?.data || error.message);
    throw error;
  }
}
