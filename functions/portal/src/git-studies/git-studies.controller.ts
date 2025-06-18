import {
  BadRequestException,
  Controller,
  Get,
  Middleware,
  Query,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { GitStudiesService } from "./git-studies.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/git-studies")
export class GitStudiesController {
  constructor(private readonly gitStudiesService: GitStudiesService) {}

  @Get("studies")
  async getStudies() {
    try {
      const studies = await this.gitStudiesService.getStudiesFromRepo();
      return studies;
    } catch (error: any) {
      console.error(`Error fetching studies: ${error.message}`);
      throw new BadRequestException(
        `Failed to fetch studies from repository: ${error.message}`
      );
    }
  }

  @Get("study/strategus")
  async getStudyStrategus(@Query() queryParams: any) {
    const { studyId } = queryParams;

    if (!studyId) {
      throw new BadRequestException("Study ID is required");
    }

    try {
      const strategusJson = await this.gitStudiesService.getStudyStrategusJson(
        studyId
      );
      return strategusJson;
    } catch (error: any) {
      console.error(`Error fetching strategus JSON: ${error.message}`);
      throw new BadRequestException(
        `Failed to fetch strategus JSON from repository: ${error.message}`
      );
    }
  }
}
