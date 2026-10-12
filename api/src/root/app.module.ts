
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@common/config/app-config.module.js';
import { DatabaseModule } from '@common/database/database.module.js';
import { HealthModule } from '@core/health/health.module.js';
import { AccountModule } from '@core/account/account.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AccountModule,
  ],
})
export class AppModule {}
