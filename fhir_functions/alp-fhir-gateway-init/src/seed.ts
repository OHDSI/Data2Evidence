import { DbCredentialsAPI } from "./api/DbCredentialsAPI";
import PortalServerAPI from "./api/PortalServerAPI";
import { env } from "./env";
import { DbCredentialProcessor } from "./utils/credentialProcessor";
import { IDbCreateDto, IDbCredential } from "./utils/type"

export async function seed(): Promise<void> {
  try{
    let logger = console;
    logger.info("Adding database");
    logger.info(`Credentials public key: ${env.DB_CREDENTIALS_PUBLIC_KEYS}`);
    const portalServerAPI = new PortalServerAPI();
    const accessToken = await portalServerAPI.getClientCredentialsToken();

    const dbCredentialsAPI = new DbCredentialsAPI(accessToken);
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
        userScope: "Admin",
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
      ...env.PG_DB_NAME,
      code: env.FHIR_DATABASE_CODE,
      vocabSchemas: [env.FHIR_CUSTOM_SCHEMA],
      credentials: encryptedPasswords,
    };
    const result = await dbCredentialsAPI.createDb(db);
    logger.info(`Database added: ${JSON.stringify(result)}`);
    return result;
  }catch(error){
    console.error("Error seeding database:", error);
    throw error;
  }
}
