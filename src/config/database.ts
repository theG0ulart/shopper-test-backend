import { DataSource } from 'typeorm';
import { Measure } from '../entities/Measure';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'db',
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [Measure],
  synchronize: true,
});
