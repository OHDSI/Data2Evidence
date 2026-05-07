import { Module, TokenInjector } from '@danet/core'
import { DatabaseModule } from '../database/module.ts'
import { PORTAL_REPOSITORY } from '../common/const.ts'
import { ConfigController } from './config.controller.ts'
import { ConfigService } from './config.service.ts'
import { ConfigRepository } from './repository/config.repository.ts'
import { RequestContextService } from '../common/request-context.service.ts'

@Module({
  imports: [DatabaseModule],
  controllers: [ConfigController],
  injectables: [ConfigService, ConfigRepository, RequestContextService, new TokenInjector(ConfigRepository, PORTAL_REPOSITORY)],
})
export class ConfigModule { }
