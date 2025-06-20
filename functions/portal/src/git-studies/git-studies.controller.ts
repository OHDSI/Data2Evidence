import {
  Controller,
  Get,
  Middleware,
  Query,
  BadRequestException,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { GitStudiesService } from "./git-studies.service.ts";
import { GitStudiesQueryDto } from "./dto/study.query.dto.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/git-studies")
export class GitStudiesController {
  constructor(private readonly gitStudiesService: GitStudiesService) {}

  @Get("studies")
  async getStudies() {
    return await this.gitStudiesService.getStudiesFromRepo();
  }

  @Get("study/strategus")
  async getStudyStrategus(@Query() queryParams: GitStudiesQueryDto) {
    const { studyId } = queryParams;
    if (!studyId) {
      throw new BadRequestException("Study ID is required");
    }
    return await this.gitStudiesService.getStudyStrategusJson(studyId);
  }
}
