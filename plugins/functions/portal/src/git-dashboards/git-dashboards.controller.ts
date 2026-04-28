import { Controller, Get, Middleware } from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { GitDashboardService } from "./git-dashboard.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/git-dashboards")
export class GitDashboardsController {
  constructor(private readonly gitDashboardService: GitDashboardService) {}

  @Get()
  async getDashboards() {
    return await this.gitDashboardService.getDashboardTemplatesFromRepo();
  }
}
