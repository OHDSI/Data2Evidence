import { DbCredentialsAPI } from "./api/DbCredentialsAPI";
import { env } from "./env";
import { DbCredentialProcessor } from "./CredentialProcessor";
import { IDbCreateDto, IDbCredential } from "./type"

export async function seed(): Promise<void> {
    let logger = console;
    
    logger.info("Adding database");

    const dbCredentialsAPI = new DbCredentialsAPI(token);
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
    credentials = {
        username: env.PG_ADMIN_USER,
        password: env.PG_ADMIN_PASSWORD,
        serviceScope: "Internal",
        salt: "",
        userScope: "Read",
    }
    encryptedPasswords.push(await dbCredentialProcessor.encryptDbCredential(credentials))
    const db: IDbCreateDto = {
      ...env.PG_DB_NAME,
      code: env.FHIR_DATABASE_CODE,
      vocabSchemas: [env.FHIR_CUSTOM_SCHEMA],
      credentials: encryptedPasswords,
    };
    const result = await dbCredentialsAPI.createDb(db);
    logger.info(`Database added: ${JSON.stringify(result)}`);
    return result;
}
