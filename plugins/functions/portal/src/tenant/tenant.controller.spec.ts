// tenant.controller.test.ts
import { TestingModule } from '@danet/core/testing'; // Changed from @nestjs/testing
import { assertExists } from '@std/assert'; // Deno's testing assertions
import { TenantController } from './tenant.controller.ts';
import { tenantServiceMockFactory } from './tenant.mock.ts';
import { TenantService } from './tenant.service.ts';

Deno.test('TenantController', async (t) => {
  // We'll create a controller instance for each test
  let controller: TenantController;

  await t.step('setup', async () => {
    const module = await TestingModule.create({
      controllers: [TenantController],
      providers: [{ provide: TenantService, useFactory: tenantServiceMockFactory }]
    });

    controller = module.get(TenantController);
  });

  await t.step('should be defined', () => {
    assertExists(controller);
  });
});