import { Module } from "@danet/core";
import { GitDashboardsController } from "./git-dashboards.controller.ts";
import { GitDashboardService } from "./git-dashboard.service.ts";

const imports: Array<any> = [];
const injectables = [GitDashboardService];

@Module({
  imports,
  controllers: [GitDashboardsController],
  injectables,
})
export class GitDashboardModule {}
