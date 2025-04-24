import { Injectable } from '@danet/core'
import { MinioClient } from '../minio/minio.client.ts'
import { PrefectFlowRunResultDto } from './dto/index.ts'

@Injectable()
export class PrefectService {
  constructor(private readonly minioClient: MinioClient) { }

  // Get flow run result
  async getFlowRunResults(prefectFlowRunResultDto: PrefectFlowRunResultDto) {
    try {
      if (prefectFlowRunResultDto.filePath) {
        return await this.minioClient.getFlowRunResults(prefectFlowRunResultDto.filePath)
      } else if (prefectFlowRunResultDto.filePaths) {
        return await this.minioClient.getMultipleFlowRunResults(prefectFlowRunResultDto.filePaths)
      }        
    } catch (error) {
      throw error
    }
  }
}
