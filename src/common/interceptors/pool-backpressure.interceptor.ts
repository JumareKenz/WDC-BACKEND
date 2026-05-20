import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';

/**
 * Global backpressure interceptor: if the Postgres connection-pool queue
 * is backed up, reject new HTTP requests immediately with 503 instead of
 * letting them hang for the full connectionTimeoutMillis.
 *
 * This protects the Node event-loop under sudden load spikes and gives
 * clients a clear signal to retry with exponential back-off.
 */
@Injectable()
export class PoolBackpressureInterceptor implements NestInterceptor {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // waitingCount = how many acquire requests are queued waiting for a
    // free client.  When this grows, the pool is saturated.
    if (this.pool.waitingCount > 5) {
      throw new ServiceUnavailableException('database pool saturated; retry later');
    }
    return next.handle();
  }
}
