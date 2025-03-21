import { InternalServerErrorException } from '@danet/core'
import { Controller, Get, Query } from "@danet/core";
import { PrefectFlowRunResultDto } from "./dto/index.ts";
import { PrefectService } from "./prefect.service.ts";

@Controller("system-portal/prefect")
export class PrefectController {
  constructor(private readonly prefectService: PrefectService) {}

  @Get("results")
  async getFlowRunResults(
    @Query("filePath", { value: "first" }) filePath?: string,
    @Query("filePaths[]", { value: "array" }) filePaths?: string[]
  ) {
    const prefectFlowRunResultDto: PrefectFlowRunResultDto = {};

    if (filePath) {
      prefectFlowRunResultDto.filePath = filePath;
    } else if (filePaths?.length) {
      prefectFlowRunResultDto.filePaths = filePaths;
    }

    try {
      return await this.prefectService.getFlowRunResults(prefectFlowRunResultDto);
    } catch (error) {
      throw new InternalServerErrorException('File path is not defined for DQD flow run results');
    }
  }
}
