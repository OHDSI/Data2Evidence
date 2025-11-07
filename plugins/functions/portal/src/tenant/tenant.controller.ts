import { Controller, Get } from "@danet/core";
import { TenantService } from "./tenant.service.ts";

@Controller("system-portal/tenant")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get("list")
  async getTenants() {
    return await this.tenantService.getTenants();
  }

  @Get("list/me")
  async getMyTenants() {
    return await this.tenantService.getMyTenants();
  }
}
