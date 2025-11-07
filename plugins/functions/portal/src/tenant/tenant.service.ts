import { Injectable } from '@danet/core';
import { ITenant } from '../types.d.ts';
import { env } from '../env.ts';
@Injectable()
export class TenantService {
  private readonly tenant: ITenant;
  private _env = Deno.env.toObject();

  constructor() {
    this.tenant = {
      id: env.TENANT_ID,
      name: env.TENANT_NAME,
      system: env.SYSTEM_NAME
    };
  }

  getTenant() {
    return this.tenant;
  }

  getTenants() {
    return [this.tenant];
  }

  getMyTenants() {
    return [this.tenant];
  }
}