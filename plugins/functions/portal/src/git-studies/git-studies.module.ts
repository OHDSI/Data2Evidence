import { Module } from "@danet/core";
import { GitStudiesController } from "./git-studies.controller.ts";
import { GitStudiesService } from "./git-studies.service.ts";

const imports: Array<any> = [];
const injectables = [GitStudiesService];

@Module({
  imports,
  controllers: [GitStudiesController],
  injectables,
})
export class GitStudiesModule {}
