import { Body, Controller, Get, Middleware, Post } from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { FeatureUpdateDto } from "./dto/feature.update.dto.ts";
import { FeatureService } from "./feature.service.ts";
@Middleware(RequestContextMiddleware)
@Controller("system-portal/feature")
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get("list")
  async getFeatures() {
    return await this.featureService.getFeatures();
  }

  @Post()
  async setFeature(@Body() featureDto: FeatureUpdateDto) {
    return await this.featureService.setFeature(featureDto);
  }
}
