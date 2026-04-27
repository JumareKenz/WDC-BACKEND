import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { loadConfig } from '../../config/configuration';

export const POSTGRES_POOL = Symbol('POSTGRES_POOL');
export const POSTGRES_DB = Symbol('POSTGRES_DB');

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: (): Pool => {
        const cfg = loadConfig();
        return new Pool({
          connectionString: cfg.databaseUrl,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });
      },
    },
    {
      provide: POSTGRES_DB,
      inject: [POSTGRES_POOL],
      useFactory: (pool: Pool): NodePgDatabase => drizzle(pool),
    },
  ],
  exports: [POSTGRES_POOL, POSTGRES_DB],
})
export class PostgresModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // Pool drained by pg on process exit; explicit close not required for SIGTERM.
    // If a future shutdown path needs it, inject POSTGRES_POOL and call .end() here.
  }
}
