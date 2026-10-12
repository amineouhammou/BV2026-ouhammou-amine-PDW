import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {validateEnvironment} from "@common/config/environment/environment.validation.js";
import {EnvService} from "@common/config/env.service.js";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
  ],
  providers: [EnvService],
  exports: [EnvService],
})
export class AppConfigModule {}