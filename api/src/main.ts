import { NestFactory } from '@nestjs/core';
import { AppModule } from './root/app.module.js';
import {EnvService} from "@common/config/env.service.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const envService = app.get(EnvService);

  await app.listen(envService.appPort);
}

await bootstrap();