import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { loadConfig } from '../../config/configuration';
import { StorageService } from './storage.service';
import { S3_CLIENT } from './tokens';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (): S3Client => {
        const cfg = loadConfig();
        return new S3Client({
          endpoint: cfg.s3.endpoint,
          region: cfg.s3.region,
          credentials: {
            accessKeyId: cfg.s3.accessKey,
            secretAccessKey: cfg.s3.secretKey,
          },
          forcePathStyle: cfg.s3.forcePathStyle,
        });
      },
    },
    StorageService,
  ],
  exports: [S3_CLIENT, StorageService],
})
export class StorageModule {}
