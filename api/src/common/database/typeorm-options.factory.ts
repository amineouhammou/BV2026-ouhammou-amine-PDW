import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { EnvService } from '../config/env.service.js';

export function createDataSourceOptions(
  env: EnvService,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.dbHost,
    port: env.dbPort,
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    synchronize: false,
  };
}

export function createNestTypeOrmOptions(
  env: EnvService,
): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(env),
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 1000,
  };
}