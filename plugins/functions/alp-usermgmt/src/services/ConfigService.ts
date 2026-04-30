import { Container ,  Service } from 'typedi'
import type { Knex } from '../types'
import { createLogger } from '../Logger'
import { ConfigRepository } from '../repositories'
import { ConfigSetRequest, ITokenUser } from '../types'
import { CONFIG_KEY, CONTAINER_KEY } from '../const'

@Service()
export class ConfigService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly configRepo: ConfigRepository) {}

  async getConfigs(codes: string[]) {
    return await this.configRepo.getListByCodes(codes)
  }

  async setConfigs(request: ConfigSetRequest) {
    const currentUser = Container.get<ITokenUser>(CONTAINER_KEY.CURRENT_USER)

    const { configs } = request

    const hasInvalidConfig = configs.some(c => !Object.keys(CONFIG_KEY).includes(c.code))
    if (hasInvalidConfig) {
      this.logger.error(`The given 'configs' contains invalid code`)
      throw new Error(`The given 'configs' contains invalid code`)
    }

    const db = Container.get<Knex.Transaction>(CONTAINER_KEY.DB_CONNECTION)
    const trx = await db.transactionProvider()()

    try {
      for (const item of configs) {
        const exists = await this.configRepo.exists({ code: item.code }, trx)
        if (exists) {
          await this.configRepo.update(item, { code: item.code }, currentUser, trx)
        } else {
          await this.configRepo.create(item, currentUser, trx)
        }
      }

      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when setting config: ${JSON.stringify(err)}`)
      throw err
    }
  }
}
