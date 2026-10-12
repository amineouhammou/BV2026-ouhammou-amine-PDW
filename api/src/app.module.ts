import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/app-config.module.js';
import { HealthModule } from './core/index.js';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
  ],
})
export class AppModule {}