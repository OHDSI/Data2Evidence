import { Logger } from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { Container } from 'typedi'
import { env } from './env'
import { DbCredentialRepository, DbExtraRepository, DbRepository, DbVocabSchemaRepository } from './db/repository'
import { SERVICE_SCOPE, USER_SCOPE } from './common/const'

interface EnvDbCredential {
  adminUser: string
  adminPassword: string
  adminPasswordSalt: string
  readUser: string
  readPassword: string
  readPasswordSalt: string
}

function createCredentialEntities(envDbCredential: EnvDbCredential, serviceScope: string, dbId: string) {
  const dbCredentialRepo = Container.get(DbCredentialRepository)
  const baseEntity = {
    serviceScope: serviceScope,
    dbId,
    createdBy: 'local',
    modifiedBy: 'local'
  }
  const adminCredentials = dbCredentialRepo.create({
    ...baseEntity,
    username: envDbCredential.adminUser,
    password: envDbCredential.adminPassword,
    salt: envDbCredential.adminPasswordSalt,
    userScope: USER_SCOPE.ADMIN
  })
  const readCredentials = dbCredentialRepo.create({
    ...baseEntity,
    username: envDbCredential.readUser,
    password: envDbCredential.readPassword,
    salt: envDbCredential.readPasswordSalt,
    userScope: USER_SCOPE.READ
  })
  return [adminCredentials, readCredentials]
}

function createVocabSchema(dialect: string, dbId: string) {
  const vocabSchemaRepo = Container.get(DbVocabSchemaRepository)
  const vocabSchema = dialect === 'hana' ? 'CDMVOCAB' : 'cdmvocab'
  return vocabSchemaRepo.create({
    name: vocabSchema,
    dbId,
    createdBy: 'local',
    modifiedBy: 'local'
  })
}

export function loadLocalDatabaseCredentials(logger: Logger) {
  if (env.DATABASE_CREDENTIALS && env.DATABASE_CREDENTIALS !== '{}') {
    const envCredentials = JSON.parse(env.DATABASE_CREDENTIALS)

    const dbRepo = Container.get(DbRepository)
    const dbExtraRepo = Container.get(DbExtraRepository)
    return envCredentials.map(cred => {
      const { host, port, code, databaseName, dialect, credentials, ...rest } = cred.values

      return dbRepo.findOneBy({ name: databaseName }).then(db => {
        if (db) {
          logger.info(`Database credentials ${databaseName} is already added`)
        } else {
          const dbId = uuidv4()
          const internalExtra = dbExtraRepo.create({
            serviceScope: SERVICE_SCOPE.INTERNAL,
            value: rest,
            dbId,
            createdBy: 'local',
            modifiedBy: 'local'
          })
          const entity = dbRepo.create({
            id: dbId,
            host,
            port,
            code,
            name: databaseName,
            dialect,
            credentials: createCredentialEntities(credentials, SERVICE_SCOPE.INTERNAL, dbId),
            extra: [internalExtra],
            vocabSchemas: [createVocabSchema(dialect, dbId)],
            createdBy: 'local',
            modifiedBy: 'local'
          })
          return dbRepo.save(entity)
        }
      })
    })
  } else {
    logger.warn(
      'Database credentials environment variable is missing. Unable to load database credentials from environment variable'
    )
  }
}
