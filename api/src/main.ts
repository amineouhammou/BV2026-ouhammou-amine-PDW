import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { EnvService } from '@common/config/index.js';
import { AppModule } from '@root/app.module.js';

export const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(),
  );

  const envService = app.get(EnvService);
  await app.listen(envService.appPort);
};

void bootstrap();
