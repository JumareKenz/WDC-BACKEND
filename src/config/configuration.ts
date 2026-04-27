import { z } from 'zod';

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  databaseUrl: z.string().url(),
  databaseReplicaUrl: z.string().url().optional(),
  redisUrl: z.string().url(),
  s3: z.object({
    endpoint: z.string().url(),
    region: z.string().default('us-east-1'),
    accessKey: z.string().min(1),
    secretKey: z.string().min(1),
    bucket: z.string().min(1),
    forcePathStyle: z.coerce.boolean().default(true),
  }),
  reports: z.object({
    sealGraceDays: z.coerce.number().int().nonnegative().default(7),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  const raw = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL,
    databaseReplicaUrl: process.env.DATABASE_REPLICA_URL,
    redisUrl: process.env.REDIS_URL,
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      bucket: process.env.S3_BUCKET,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE,
    },
    reports: {
      sealGraceDays: process.env.REPORT_SEAL_GRACE_DAYS,
    },
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return result.data;
}
