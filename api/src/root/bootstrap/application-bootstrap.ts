import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';

import {
  ApiInterceptor,
  HttpExceptionFilter,
  ValidationException,
} from '@common/api/index.js';
import { setupSwagger } from '@common/api/swagger/setup-swagger.js';
import { EnvService } from '@common/config/index.js';

export const configureApplication = (app: INestApplication): void => {
  const envService = app.get(EnvService);

  app.setGlobalPrefix(envService.appBaseUrl, {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      exceptionFactory: (errors) =>
        ValidationException.fromClassValidatorErrors(
          errors,
          envService.httpPayloadErrorStatusCode,
        ),
    }),
  );

  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(app.get(ApiInterceptor));

  setupSwagger(app);
};
