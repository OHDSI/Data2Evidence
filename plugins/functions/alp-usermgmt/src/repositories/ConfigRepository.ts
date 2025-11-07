//import  { Knex } from 'knex'
import { Inject,Service } from 'typedi'
import { Config } from '../entities'
import { Repository } from './Repository'
import { CONTAINER_KEY } from '../const'

export interface ConfigCriteria {
  code: string
}

export interface ConfigField {
  code: string
  value: string
}

@Service()
export class ConfigRepository extends Repository<Config, ConfigCriteria> {
  constructor(@Inject(CONTAINER_KEY.DB_CONNECTION) public readonly db: any) {
    super(db)
  }

  async getListByCodes(codes: string[]) {
    const query = this.db(this.tableName).where(query => codes.map(c => query.orWhere('code', c)))
    return await query.then(result => result.map(row => this.reducer(row)))
  }

  reducer({ code, value }: ConfigField) {
    return new Config({
      code,
      value
    })
  }
}
