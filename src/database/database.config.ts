import 'dotenv/config';
import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { entities } from './entities';

export function databaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const required = (key: string): string => {
    const value = env[key];
    if (!value?.trim())
      throw new Error(`Missing required environment variable: ${key}`);
    return value;
  };
  const port = Number(env.DB_PORT ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid DB_PORT');
  if (env.DB_SSL && !['true', 'false'].includes(env.DB_SSL))
    throw new Error('DB_SSL must be true or false');
  return {
    type: 'postgres',
    host: required('DB_HOST'),
    port,
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    entities,
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    migrationsTransactionMode: 'all',
    logging: ['error', 'warn'],
  };
}
