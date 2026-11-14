import { DynamicModule, Module } from '@nestjs/common';

import { AppConfigModule } from '@common/config/index.js';
import { DatabaseModule } from '@common/database/database.module.js';
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
        DatabaseModule,
        HealthModule,
        AccountModule,
        AuthModule,
      ],
    };
  }
}
