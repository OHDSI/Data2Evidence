import { Service } from 'typedi'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../logger'
import {
  DbRepository,
  DbExtraRepository,
  DbCredentialRepository,
  DbPublicationRepository,
  DbVocabSchemaRepository
} from './repository'
import { DbDialect, IDbCredentialDto, IDbCredentialUpdateDto, IDbDto, IDbExtraDto, IDbUpdateDto } from '../types'
import { getReqContext } from '../common/hook'
import { SERVICE_SCOPE } from '../common/const'
import { IDbPublicationDto } from '../types'

@Service()
export class DbService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly dbRepo: DbRepository,
    private readonly dbExtraRepo: DbExtraRepository,
    private readonly credentialRepo: DbCredentialRepository,
    private readonly vocabSchemaRepo: DbVocabSchemaRepository,
    private readonly publicationRepo: DbPublicationRepository
  ) {}

  async list() {
    const { grantType } = getReqContext()
    const isClientCredentials = grantType === 'client_credentials'
    const query = this.dbRepo
      .createQueryBuilder('db')
      .leftJoinAndSelect(
        'db.credentials',
        'dbCredential',
        'db.id = dbCredential.dbId AND dbCredential.serviceScope = :serviceScope',
        {
          serviceScope: SERVICE_SCOPE.INTERNAL
        }
      )
      .leftJoinAndSelect('db.vocabSchemas', 'dbVocabSchema')
      .leftJoinAndSelect('db.extra', 'dbExtra')
      .leftJoinAndSelect('db.publications', 'dbPublication')
    const result = await query.select(this.getDbColumns(isClientCredentials)).getMany()
    return result.map(r => {
      const { extra, vocabSchemas, publications, ...entity } = r
      return {
        ...entity,
        extra,
        vocabSchemas: vocabSchemas.map(vocabSchema => vocabSchema.name),
        publications
      }
    })
  }

  async get(id: string, serviceScope: string) {
    const maskedValue = '*******'
    const { grantType } = getReqContext()
    const db = await this.dbRepo
      .createQueryBuilder('db')
      .leftJoinAndSelect('db.credentials', 'dbCredential')
      .leftJoinAndSelect('db.extra', 'dbExtra')
      .where('db.id = :id AND dbCredential.serviceScope = :serviceScope', {
        id,
        serviceScope
      })
      .select(this.getDbColumns(true))
      .getOne()

    if (!db) {
      return null
    }
    if (grantType !== 'client_credentials') {
      db.credentials.forEach(c => {
        c.password = maskedValue
        if (c !== undefined) delete c.salt
      })
    }

    const extra = db.extra.find(ext => ext !== undefined && ext.serviceScope === serviceScope)?.value

    return {
      ...db,
      extra
    }
  }

  async getVocabSchemas(dialect: DbDialect) {
    const result = await this.dbRepo
      .createQueryBuilder('db')
      .leftJoinAndSelect('db.vocabSchemas', 'vocabSchema')
      .select(['db.code', 'vocabSchema.name'])
      .where('db.dialect = :dialect', { dialect })
      .getMany()

    return result.reduce((acc, db) => {
      acc[db.code] = db.vocabSchemas.map(vocabSchema => vocabSchema.name)
      return acc
    }, {})
  }

  async create(dbDto: IDbDto) {
    const dbId = uuidv4()
    const { credentials, extra, vocabSchemas, publications, ...newDbDto } = dbDto

    const credEntities = this.mapCredentialsToEntity(credentials, dbId)
    const entity = this.dbRepo.create({
      ...newDbDto,
      id: dbId,
      extra: this.mapExtraToEntity(extra, dbId),
      credentials: credEntities,
      vocabSchemas: this.mapVocabSchemasToEntity(vocabSchemas, dbId),
      publications: this.mapPublicationsToEntity(publications, dbId)
    })
    await this.dbRepo.save(this.addOwner(entity))
    this.logger.debug(`Created db: ${JSON.stringify(entity)}`)
    return entity.id
  }

  async update(dbDto: IDbUpdateDto) {
    const { id, name, port, host, vocabSchemas, extra, publications } = dbDto

    const existingDb = (await this.dbRepo
      .createQueryBuilder('db')
      .leftJoinAndSelect('db.vocabSchemas', 'vocabSchema')
      .leftJoinAndSelect('db.extra', 'dbExtra')
      .leftJoinAndSelect('db.publications', 'dbPublication')
      .where('db.id = :id', { id })
      .getOne()) as { vocabSchemas; extra; name; host; port; publications }

    const {
      vocabSchemas: existingVocabSchemaEntities,
      extra: existingExtraEntities,
      name: existingName,
      host: existingHost,
      port: existingPort,
      publications: existingPublicationEntities
    } = existingDb

    if (name !== existingName || host !== existingHost || port !== existingPort) {
      await this.dbRepo.update({ id: id }, { name: name, host: host, port: port })
    }

    if (vocabSchemas) {
      const vocabSchemaEntities = this.mapVocabSchemasToEntity(vocabSchemas, dbDto.id)
      await this.vocabSchemaRepo.upsert(vocabSchemaEntities, ['name', 'dbId'])
      existingVocabSchemaEntities
        .filter(o => vocabSchemaEntities.find(n => o.name === n.name) === undefined)
        .forEach(async existingVocabSchema => {
          await this.vocabSchemaRepo.delete({ name: existingVocabSchema.name, dbId: id })
        })
    } else {
      await this.vocabSchemaRepo.delete({ dbId: id })
    }

    if (extra) {
      const extraEntities = this.mapExtraToEntity(extra, dbDto.id)
      await this.dbExtraRepo.upsert(extraEntities, ['serviceScope', 'dbId'])
      existingExtraEntities
        ?.filter(o => !extraEntities.find(n => o.serviceScope === n.serviceScope && o.dbId === n.dbId))
        .forEach(async existingExtra => {
          await this.dbExtraRepo.delete({ serviceScope: existingExtra.serviceScope, dbId: id })
        })
    } else {
      await this.dbExtraRepo.delete({ dbId: id })
    }

    if (publications) {
      const pubEntities = this.mapPublicationsToEntity(publications, dbDto.id)
      await this.publicationRepo.upsert(pubEntities, ['publication', 'dbId'])
      existingPublicationEntities
        .filter(o => pubEntities.find(n => o.publication === n.publication) === undefined)
        .forEach(async existingPublication => {
          await this.publicationRepo.delete({ publication: existingPublication.publication, dbId: id })
        })
    } else {
      await this.publicationRepo.delete({ dbId: id })
    }

    this.logger.debug(`Updated db: ${JSON.stringify(dbDto)}`)
    return id
  }
  async updateCredentials(dbDto: IDbCredentialUpdateDto) {
    const { id, credentials } = dbDto
    const existingDb = (await this.dbRepo
      .createQueryBuilder('db')
      .leftJoinAndSelect('db.credentials', 'dbCredential')
      .where('db.id = :id', { id })
      .getOne()) as { credentials }

    const { credentials: existingCredEntities } = existingDb
    if (credentials) {
      const credEntities = this.mapCredentialsToEntity(credentials, dbDto.id)
      await this.credentialRepo.upsert(credEntities, ['username', 'dbId', 'userScope'])
      existingCredEntities
        .filter(o => credEntities.find(n => o.username === n.username) === undefined)
        .forEach(async existingCredential => {
          await this.credentialRepo.delete({ username: existingCredential.username, dbId: id })
        })
    } else {
      await this.credentialRepo.delete({ dbId: id })
    }

    this.logger.debug(`Updated db credentials: ${JSON.stringify(dbDto)}`)
    return id
  }

  async delete(id: string) {
    await this.dbRepo.delete({ id: id })
    this.logger.info(`Deleted db: ${id}`)
    return id
  }

  private getDbColumns(hasSecret: boolean = false) {
    const baseColumns = [
      'db.id',
      'db.code',
      'db.host',
      'db.port',
      'db.name',
      'db.dialect',
      'db.authenticationMode',
      'dbCredential.username',
      'dbCredential.userScope',
      'dbCredential.serviceScope',
      'dbVocabSchema.name',
      'dbExtra.value',
      'dbExtra.serviceScope',
      'dbPublication.publication',
      'dbPublication.slot'
    ]
    if (hasSecret) {
      return [...baseColumns, 'dbCredential.password', 'dbCredential.salt']
    }
    return baseColumns
  }

  private addOwner<T>(object: T, ownerId?: string) {
    const { userId } = getReqContext()
    return {
      ...object,
      createdBy: ownerId ? ownerId : userId,
      modifiedBy: userId
    }
  }

  private mapExtraToEntity(extraDto: IDbExtraDto, dbId: string) {
    return Object.keys(extraDto).map(serviceScope => {
      const entity = this.addOwner({
        serviceScope,
        dbId,
        value: extraDto[serviceScope]
      })
      return this.dbExtraRepo.create(entity)
    })
  }

  private mapCredentialsToEntity(credentials: IDbCredentialDto[], dbId: string) {
    return credentials.map(cred => {
      const credEntity = this.credentialRepo.create({
        ...cred,
        dbId: dbId
      })
      return this.addOwner(credEntity)
    })
  }

  private mapVocabSchemasToEntity(vocabSchemas: string[], dbId: string) {
    return vocabSchemas.map(vocabSchema => {
      const entity = this.addOwner({
        dbId,
        name: vocabSchema
      })
      return this.vocabSchemaRepo.create(entity)
    })
  }

  private mapPublicationsToEntity(publications: IDbPublicationDto[], dbId: string) {
    return publications?.map(pub => {
      const pubEntity = this.publicationRepo.create({
        ...pub,
        dbId: dbId
      })
      return this.addOwner(pubEntity)
    })
  }
}
