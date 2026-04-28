import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { REDIS_CLIENT } from '../../infra/redis/redis.module';
import { Public } from '../../common/auth/public.decorator';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(POSTGRES_POOL) private readonly pg: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('live')
  live(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.pingPostgres(), () => this.pingRedis()]);
  }

  private async pingPostgres(): Promise<HealthIndicatorResult> {
    const started = Date.now();
    try {
      const client = await this.pg.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      return { postgres: { status: 'up', latencyMs: Date.now() - started } };
    } catch (err) {
      throw new HealthCheckError('postgres unreachable', {
        postgres: { status: 'down', error: (err as Error).message },
      });
    }
  }

  private async pingRedis(): Promise<HealthIndicatorResult> {
    const started = Date.now();
    try {
      const reply = await this.redis.ping();
      if (reply !== 'PONG') {
        throw new Error(`unexpected reply: ${reply}`);
      }
      return { redis: { status: 'up', latencyMs: Date.now() - started } };
    } catch (err) {
      throw new HealthCheckError('redis unreachable', {
        redis: { status: 'down', error: (err as Error).message },
      });
    }
  }
}
