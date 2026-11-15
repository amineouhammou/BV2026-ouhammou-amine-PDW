import 'dotenv/config';
import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { validateEnvironment } from '../src/common/config/environment/environment.validation.js';
import { createTypeOrmDataSourceOptions } from '../src/common/database/typeorm/typeorm-options.factory.js';

const environment = validateEnvironment(process.env);

export default new DataSource(createTypeOrmDataSourceOptions(environment));
