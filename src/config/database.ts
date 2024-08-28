import { DataSource } from 'typeorm';
import { Measure } from '../entities/Measure';

import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [Measure],
  synchronize: true,
  logging: true,
    logger: 'advanced-console',
});
