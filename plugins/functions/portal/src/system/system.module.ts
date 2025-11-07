import { Module } from '@danet/core';
import { DatabaseModule } from "../database/module.ts";
import { SystemController } from './system.controller.ts';
import { SystemService } from './system.service.ts';
import { RequestContextService } from '../common/request-context.service.ts';

@Module({
  controllers: [SystemController],
  injectables: [SystemService, RequestContextService],
  imports: [DatabaseModule]
})
export class SystemModule { }
