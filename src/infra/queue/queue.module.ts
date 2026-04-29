import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { loadConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { Redis } from 'ioredis';

export const OCR_QUEUE = Symbol('OCR_QUEUE');
export const ASR_QUEUE = Symbol('ASR_QUEUE');
export const MESSAGES_QUEUE = Symbol('MESSAGES_QUEUE');

@Global()
@Module({
  providers: [
    {
      provide: OCR_QUEUE,
      useFactory: (_redis: Redis): Queue => {
        const cfg = loadConfig();
        return new Queue('ocr.process', {
          connection: { url: cfg.redisUrl },
          defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        });
      },
      inject: [REDIS_CLIENT],
    },
    {
      provide: ASR_QUEUE,
      useFactory: (_redis: Redis): Queue => {
        const cfg = loadConfig();
        return new Queue('asr.transcribe', {
          connection: { url: cfg.redisUrl },
          defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        });
      },
      inject: [REDIS_CLIENT],
    },
    {
      provide: MESSAGES_QUEUE,
      useFactory: (_redis: Redis): Queue => {
        const cfg = loadConfig();
        return new Queue('messages.dispatch', {
          connection: { url: cfg.redisUrl },
          defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        });
      },
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [OCR_QUEUE, ASR_QUEUE, MESSAGES_QUEUE],
})
export class QueueModule {}
