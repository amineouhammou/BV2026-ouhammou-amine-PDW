import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ApiInterceptor, HttpExceptionFilter } from '@common/api/index.js';
import { AppConfigModule } from '@common/config/index.js';
import { DatabaseModule } from '@common/database/index.js';
import { ApplicationLifecycleLogger, LoggingModule } from '@common/logging/index.js';
import { HealthModule } from '@core/health/index.js';
import { AccountModule } from '@core/account/index.js';
import { AuthModule } from '@core/auth/index.js';

@Module({})
export class AppModule {
  static register(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.register(),
        LoggingModule,
        DatabaseModule,
        ThrottlerModule.forRoot([
          {
            name: 'global',
            ttl: 60_000,
            limit: 100,
          },
        ]),
        HealthModule,
        AccountModule,
        AuthModule,
      ],
      providers: [
        ApiInterceptor,
        HttpExceptionFilter,
        ApplicationLifecycleLogger,
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    };
  }
}
