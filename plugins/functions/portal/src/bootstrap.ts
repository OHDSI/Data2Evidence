import { DanetApplication } from '@danet/core';
import { SpecBuilder, SwaggerModule } from '@danet/swagger';
import { AppModule } from './app.module.ts';
import { loggerMiddleware } from './logger.middleware.ts';
export const bootstrap = async () => {
  const application = new DanetApplication();
  await application.init(AppModule);
  const spec = new SpecBuilder()
    .setTitle('D2E Portal')
    .setDescription('')
    .setVersion('1.0')
    .build();
  const document = await SwaggerModule.createDocument(application, spec);
  await SwaggerModule.setup('api', application, document);
  application.addGlobalMiddlewares(loggerMiddleware);
  return application;
};
