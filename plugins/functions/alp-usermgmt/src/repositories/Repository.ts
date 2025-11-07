import type { Knex } from '../types'
import { createLogger } from '../Logger'
import { ITokenUser, Pagination } from '../types'
import { DateNow } from '../utils'

export abstract class Repository<TEntity, TCriteria> {
  private readonly logger = createLogger(this.constructor.name)
  protected readonly tableName?: string

  constructor(public readonly db: Knex) {
    this.tableName = this.getTableName()

    if (this.tableName == null) {
      throw new Error('Unable to derive table name')
    }
  }

  getTransaction() {
    const trxProvider = this.db.transactionProvider()
    return trxProvider()
  }

  async getOne(criteria: { [key in keyof TCriteria]?: TCriteria[key] }, trx?: Knex): Promise<TEntity | undefined> {
    this.logger.debug(`Get ${this.tableName} record by ${JSON.stringify(criteria)}`)

    const query = (trx || this.db)(this.tableName).select()
    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })
    return await query.first().then(result => result && this.reducer(result))
  }

  async getCount(criteria: { [key in keyof TCriteria]?: TCriteria[key] } = {}): Promise<number> {
    this.logger.debug(`Get ${this.tableName} record count by ${JSON.stringify(criteria)}`)

    return await this.db(this.tableName)
      .where(criteria)
      .count()
      .then(total => (total && (total[0].count as number)) || 0)
  }

  async getList<TField>(
    criteria: { [key in keyof TCriteria]?: TCriteria[key] } = {},
    orderBy?: Partial<{ [key in keyof TField]: 'asc' | 'desc' }>,
    pagination?: Pagination
  ): Promise<TEntity[]> {
    this.logger.debug(`Get ${this.tableName} records by ${JSON.stringify(criteria)}`)

    const query = this.db(this.tableName).select()
    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })

    if (orderBy) {
      Object.keys(orderBy).forEach((col: string) => {
        query.orderBy(col, orderBy[col as keyof TField])
      })
    }

    if (pagination) {
      query.offset(pagination.offset).limit(pagination.limit)
    }

    return await query.then(result => result.map(row => this.reducer(row)) || [])
  }

  async getDistinctList<TField, TResult>(
    distinct: (keyof TField)[],
    criteria: { [key in keyof TCriteria]?: TCriteria[key] } = {},
    orderBy?: Partial<{ [key in keyof TField]: 'asc' | 'desc' }>
  ): Promise<TResult[]> {
    this.logger.debug(`Get ${this.tableName} records by ${JSON.stringify(criteria)}`)

    const query = this.db(this.tableName).distinct(distinct as string[])
    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })

    if (orderBy) {
      Object.keys(orderBy).forEach((col: string) => {
        query.orderBy(col, orderBy[col as keyof TField])
      })
    }

    return await query
  }

  async exists(criteria: { [key in keyof TCriteria]?: TCriteria[key] }, trx?: Knex): Promise<boolean> {
    this.logger.debug(`Check existence of ${this.tableName} with ${JSON.stringify(criteria)}`)

    const query = (trx || this.db)(this.tableName).select(1).limit(1)
    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })

    return await query.then(result => result != null && result.length != 0)
  }

  async create<TField>(field: { [key in keyof TField]?: TField[key] }, user: ITokenUser, trx?: Knex) {
    this.logger.debug(`Create ${this.tableName} record`)

    const { userId } = user
    const audit = {
      created_by: userId,
      created_date: DateNow(),
      modified_by: userId,
      modified_date: DateNow()
    }
    const input = { ...field, ...audit }

    return await (trx || this.db)(this.tableName)
      .insert([input])
      .returning('*')
      .then((result: any[]) => this.reducer({ ...input, ...result[0] }))
  }

  async update<TField>(
    field: { [key in keyof TField]?: TField[key] },
    criteria: { [key in keyof TCriteria]?: TCriteria[key] },
    user: ITokenUser,
    trx?: Knex
  ): Promise<TEntity> {
    this.logger.debug(`Update ${this.tableName} record`)

    const { userId } = user
    const audit = {
      modified_by: userId,
      modified_date: DateNow()
    }
    const input = { ...field, ...audit }

    const query = (trx || this.db)(this.tableName).update(input)

    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })

    return await query.returning('*').then((result: any[]) => this.reducer({ ...input, ...result[0] }))
  }

  async delete(criteria: { [key in keyof TCriteria]?: TCriteria[key] }, trx?: Knex) {
    if (Object.keys(criteria).length === 0) {
      this.logger.error(`Deletion without criteria is not allowed: ${this.tableName}`)
      throw new Error(`Deletion without criteria is not allowed`)
    }

    this.logger.debug(`Delete ${this.tableName} with criteria ${JSON.stringify(criteria)}`)

    const query = (trx || this.db)(this.tableName)

    Object.keys(criteria).forEach((c: string) => {
      if (Array.isArray(criteria[c as keyof TCriteria])) {
        query.whereIn(c, criteria[c as keyof TCriteria] as any)
      } else {
        query.where(c, criteria[c as keyof TCriteria] as any)
      }
    })

    const affected = await query.count().then(total => (total && (total[0].count as number)) || 0)
    this.logger.info(`Deleting ${this.tableName} with criteria ${JSON.stringify(criteria)} (${affected} rows)`)

    return await query.delete().then(result => result)
  }

  private getTableName(): string | undefined {
    const className = Object.getPrototypeOf(this).constructor.name
    if (className.endsWith('Repository')) {
      const pascalCaseName = className.substr(0, className.length - 'Repository'.length)
      return pascalCaseName
        .replace(/(?:^|\.?)([A-Z])/g, (x: string, y: string) => '_' + y.toLowerCase())
        .replace(/^_/, '')
    }
  }

  abstract reducer(columns: any): TEntity
}
