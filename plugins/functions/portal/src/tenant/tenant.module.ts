import { Module } from '@danet/core';
import { TenantController } from './tenant.controller.ts';
import { TenantService } from './tenant.service.ts';
@Module({
  controllers: [TenantController],
  injectables: [TenantService],
})
export class TenantModule { }
