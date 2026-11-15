import { DynamicModule, Module } from '@nestjs/common';

import { ApiInterceptor } from '@common/api/index.js';
import { AppConfigModule } from '@common/config/index.js';
import { DatabaseModule } from '@common/database/database.module.js';
import {
  ApplicationLifecycleLogger,
  LoggingModule,
} from '@common/logging/index.js';
import { AccountModule } from '@core/account/account.module.js';
import { AuthModule } from '@core/auth/auth.module.js';
import { HealthModule } from '@core/health/health.module.js';

@Module({})
export class AppModule {
  static register(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.register(),
        LoggingModule,
        DatabaseModule,
        HealthModule,
        AccountModule,
        AuthModule,
      ],
      providers: [ApiInterceptor, ApplicationLifecycleLogger],
    };
  }
}
