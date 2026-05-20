import { Global, Module, ServiceUnavailableException, type OnApplicationShutdown } from '@nestjs/common';
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
        const pool = new Pool({
          connectionString: cfg.databaseUrl,
          max: cfg.dbPoolMax,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 2_000,
        });
        // Gracefully map pool-connect timeouts to 503 so the client gets a
        // clear retry signal instead of an unhandled 500.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalConnect = (pool.connect as any).bind(pool);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pool as any).connect = async (...args: any[]) => {
          try {
            return await originalConnect(...args);
          } catch (err) {
            if (err instanceof Error && err.message === 'timeout exceeded when trying to connect') {
              throw new ServiceUnavailableException('database pool saturated; retry later');
            }
            throw err;
          }
        };
        // Per-request role-switch (SET LOCAL ROLE wdc_app) and DEK injection
        // happen inside withRlsTransaction(); doing it on pool.on('connect')
        // is fire-and-forget and not guaranteed to complete before the
        // client is handed out. See ADR / SESSION-LOG.
        return pool;
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
