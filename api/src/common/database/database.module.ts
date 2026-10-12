import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvService } from '../config/env.service.js';
import { createNestTypeOrmOptions } from './typeorm-options.factory.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvService],
      useFactory: createNestTypeOrmOptions,
    }),
  ],
})
export class DatabaseModule {}