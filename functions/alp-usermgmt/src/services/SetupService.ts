import { Container ,  Service } from 'typedi'
import type { Knex } from '../types'
import { createLogger } from '../Logger'
import { AzureADSetupRequest, ConfigItem } from '../types'
import { CONFIG_KEY, CONTAINER_KEY } from '../const'
import { ConfigService } from './ConfigService'

@Service()
export class SetupService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly configService: ConfigService) {}

  async getAzureADConfig() {
    const configs = [
      CONFIG_KEY.ROLE_TENANT_VIEWER_GROUP_ID,
      CONFIG_KEY.ROLE_SYSTEM_ADMIN_GROUP_ID,
      CONFIG_KEY.ROLE_USER_ADMIN_GROUP_ID
    ]
    return await this.configService.getConfigs(configs)
  }

  async setupAzureAD(request: AzureADSetupRequest) {
    const { tenantViewerGroupId, systemAdminGroupId, userAdminGroupId } = request

    const db = Container.get<Knex.Transaction>(CONTAINER_KEY.DB_CONNECTION)
    const trx = await db.transactionProvider()()

    this.logger.info('Setup Azure AD')

    try {
      const configs: ConfigItem[] = [
        {
          code: CONFIG_KEY.ROLE_TENANT_VIEWER_GROUP_ID,
          value: tenantViewerGroupId
        },
        {
          code: CONFIG_KEY.ROLE_SYSTEM_ADMIN_GROUP_ID,
          value: systemAdminGroupId
        },
        {
          code: CONFIG_KEY.ROLE_USER_ADMIN_GROUP_ID,
          value: userAdminGroupId
        }
      ]
      await this.configService.setConfigs({ configs })

      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when setting up Azure AD: ${JSON.stringify(err)}`)
      throw err
    }
  }
}
