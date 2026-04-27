import { Global, Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { loadConfig } from '../../config/configuration';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const cfg = loadConfig();
        return new Redis(cfg.redisUrl, {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
