import { Inject, Injectable } from '@danet/core'
import { IsNull } from 'npm:typeorm'
import type { PostgresService } from '../database/postgres.service.ts'
import { Dataset } from '../dataset/entity/index.ts'
import { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import { getDbCredentialsByCode } from '../env.ts'
import { IDbCredentials } from './types.ts'

export interface WebApiSyncTarget {
  dataset: Dataset
  detail: DatasetDetail
  credentials: IDbCredentials | null
}

// The datasets that own a WebAPI source, chosen the way
// DatasetCommandService.syncDatasetToWebApi chooses them.
@Injectable()
export class WebApiDatasetLoader {
  // The 'DATABASE' literal (see database/module.ts) keeps postgres.service.ts,
  // which reads PG__SSL at import time, out of the webapi unit tests.
  constructor(@Inject('DATABASE') private readonly postgresService: PostgresService) {}

  async listSyncTargets(): Promise<WebApiSyncTarget[]> {
    const manager = this.postgresService.getDataSource().manager
    const datasets = await manager.getRepository(Dataset).find({
      where: { type: 'webapi', fhirDatasetId: IsNull() },
    })
    const targets: WebApiSyncTarget[] = []
    for (const dataset of datasets) {
      const detail = await manager.getRepository(DatasetDetail).findOne({ where: { datasetId: dataset.id } })
      targets.push({
        dataset,
        detail: detail ?? ({ name: dataset.id } as DatasetDetail),
        credentials: getDbCredentialsByCode(dataset.databaseCode),
      })
    }
    return targets
  }
}
