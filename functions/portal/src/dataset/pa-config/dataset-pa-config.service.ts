import { Injectable, InternalServerErrorException, NotFoundException } from '@danet/core'
import { DEFAULT_ERROR_MESSAGE } from '../../common/const.ts'
import { PatientAnalyticsConfigService } from '../../pa-config/pa-config.service.ts'
import { DatasetRepository } from '../repository/index.ts'

@Injectable()
export class DatasetPaConfigService {
  constructor(
    private readonly datasetRepo: DatasetRepository,
    private readonly paConfigService: PatientAnalyticsConfigService
  ) { }

  async getDatasetBackendPaConfig(datasetId: string) {
    const dataset = await this.getDataset(datasetId)
    try {
      return this.paConfigService.getBackendConfig(
        dataset.paConfigId,
        datasetId
      );
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new NotFoundException(`Dataset with id ${datasetId} does not have backend PA config`)
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE)
    }
  }

  async getMyDatasetPaConfig(datasetId: string) {
    const dataset = await this.getDataset(datasetId)
    try {
      return this.paConfigService.getMyConfig(dataset.paConfigId, datasetId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new NotFoundException(`Dataset with id ${datasetId} does not have user's PA config`)
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE)
    }
  }

  private async getDataset(id: string) {
    const dataset = await this.datasetRepo.findOne({ where: { id } })
    if (!dataset) {
      throw new NotFoundException(`Dataset with id ${id} not found`)
    }
    return dataset
  }
}
