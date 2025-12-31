import { DbCredentialsAPI } from "./api/DbCredentialsAPI";
import { env } from "./env";
import { DbCredentialProcessor } from "./utils/credentialProcessor";
import { AUTHENTICATION_MODES, IDbCreateDto, IDbCredential } from "./utils/type"

export async function seed(): Promise<void> {
  try{
    let logger = console;
    logger.info("Adding FHIR database");

    const dbCredentialsAPI = new DbCredentialsAPI();
    await dbCredentialsAPI.getClientCredentialsToken()
    
    const dbList = await dbCredentialsAPI.getDbList();
    const exist = dbList.find((db) => db.code === env.FHIR_DATABASE_CODE);
    if (exist) {
      logger.info(`Database exist: ${JSON.stringify(exist)}`);
      return;
    }
    const dbCredentialProcessor = new DbCredentialProcessor();
    let credentials: IDbCredential;
    let encryptedPasswords: IDbCredential[] = [];
    credentials = {
        username: env.PG_ADMIN_USER,
        password: env.PG_ADMIN_PASSWORD,
        serviceScope: "Internal",
        salt: "",
        userScope: "Admin"
    }
    encryptedPasswords.push(await dbCredentialProcessor.encryptDbCredential(credentials))
    logger.info(`Encrypting credentials for userScope: ${encryptedPasswords[0].password}`);
    credentials = {
        username: env.PG_ADMIN_USER,
        password: env.PG_ADMIN_PASSWORD,
        serviceScope: "Internal",
        salt: "",
        userScope: "Read",
    }
    encryptedPasswords.push(await dbCredentialProcessor.encryptDbCredential(credentials))
        logger.info(`Encrypting credentials for userScope: ${encryptedPasswords[1].password}`);

    const db: IDbCreateDto = {
      name: env.PG_DB_NAME,
      code: env.FHIR_DATABASE_CODE,
      vocabSchemas: [env.FHIR_CUSTOM_SCHEMA],
      credentials: encryptedPasswords,
      host: env.PG__HOST,
      port: env.PG__PORT,
      dialect: "postgres",
      authenticationMode: AUTHENTICATION_MODES.PASSWORD,
      extra: {
        Internal:{
          "max": env.PG__MAX_POOL,
          "schema": env.FHIR_CUSTOM_SCHEMA,
          "queryTimeout": 60000,
          "statementTimeout": 60000,
          "idleTimeoutMillis": env.PG__IDLE_TIMEOUT_IN_MS,
          "connectionTimeoutMillis": 60000,
          "idleInTransactionSessionTimeout": 300000
        }
      }
    };
    const result = await dbCredentialsAPI.createDb(db);
    logger.info(`Database added: ${JSON.stringify(result)}`);
    return result;
  }catch(error: any){
    console.error("Error seeding database:", error.response?.data || error.message);
    throw error;
  }
}
