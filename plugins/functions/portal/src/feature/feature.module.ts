import { Module, TokenInjector } from '@danet/core'
import { PORTAL_REPOSITORY } from '../common/const.ts'
import { TransactionModule } from '../common/data-source/transaction-runner.module.ts'
import { RequestContextService } from '../common/request-context.service.ts'
import { DatabaseModule } from '../database/module.ts'
import { FeatureController } from './feature.controller.ts'
import { FeatureService } from './feature.service.ts'
import { FeatureRepository } from './repository/feature.repository.ts'
@Module({
  imports: [DatabaseModule, TransactionModule],
  controllers: [FeatureController],
  injectables: [RequestContextService, FeatureService, FeatureRepository, new TokenInjector(FeatureRepository, PORTAL_REPOSITORY)]
})
export class FeatureModule { }
