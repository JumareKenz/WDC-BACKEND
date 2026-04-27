import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PostgresModule } from '../../infra/postgres/postgres.module';
import { RedisModule } from '../../infra/redis/redis.module';

@Module({
  imports: [TerminusModule, PostgresModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
