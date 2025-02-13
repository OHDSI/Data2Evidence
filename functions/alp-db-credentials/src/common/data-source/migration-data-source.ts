import { DataSource, DataSourceOptions } from 'typeorm'
import { env } from '../../env'
import { getSsl, getLogLevels } from './data-source'
import { Audit } from '../entity/audit.entity'
import { Database } from '../../db/entity/db.entity'
import { DbCredential } from '../../db/entity/db-credential.entity'
import { DbExtra } from '../../db/entity/db-extra.entity'
import { DbVocabSchema } from '../../db/entity/db-vocab-schema.entity'
import { CreateDbCredential1700709870313 } from './migrations/1700709870313-create-db-credential'
import { CreateDbExtra1701667241462 } from './migrations/1701667241462-create-db-extra'
import { AddUserScopeToDbCredential1703139369074 } from './migrations/1703139369074-add-user-scope-to-db-credential'
import { UpdateDbExtra1704846290461 } from './migrations/1704846290461-update-db-extra'
import { AddCodeToDb1706063894993 } from './migrations/1706063894993-add-code-to-db'
import { AddVocabSchema1706832297709 } from './migrations/1706832297709-add-vocab-schema'
import { AddAuthenticationMode1739258149345 } from './migrations/1739258149345-add-authentication-mode'

const migrationDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.PG_HOST,
  port: env.PG_PORT,
  username: env.PG_MANAGE_USER,
  password: env.PG_MANAGE_PASSWORD,
  database: env.PG_DATABASE,
  schema: env.PG_SCHEMA,
  ssl: getSsl(),
  poolSize: env.PG_MAX_POOL,
  logging: getLogLevels(),
  entities: [Audit, Database, DbCredential, DbExtra, DbVocabSchema],
  migrations: [
    CreateDbCredential1700709870313,
    CreateDbExtra1701667241462,
    AddUserScopeToDbCredential1703139369074,
    UpdateDbExtra1704846290461,
    AddCodeToDb1706063894993,
    AddVocabSchema1706832297709,
    AddAuthenticationMode1739258149345
  ]
}

const migrationDataSource = new DataSource(migrationDataSourceOptions)
export default migrationDataSource
