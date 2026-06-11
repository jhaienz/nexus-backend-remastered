import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DrizzleProvider = {
  provide: 'DRIZZLE',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const pool = new Pool({
      host: configService.get<string>('POSTGRES_HOST'),
      port: configService.get<number>('POSTGRES_PORT'),
      user: configService.get<string>('POSTGRES_USER'),
      password: configService.get<string>('POSTGRES_PASSWORD'),
      database: configService.get<string>('POSTGRES_DB'),
      ssl: configService.get<string>('POSTGRES_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    });
    return drizzle(pool, { schema });
  },
};
