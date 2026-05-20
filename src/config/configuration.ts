import { z } from 'zod';

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  databaseUrl: z.string().url(),
  databaseReplicaUrl: z.string().url().optional(),
  dbPoolMax: z.coerce.number().int().positive().default(20),
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
  auth: z.object({
    jwtPrivateKeyPath: z.string().min(1),
    jwtPublicKeyPath: z.string().min(1),
    jwtAccessTtl: z.string().default('15m'),
    jwtRefreshTtl: z.string().default('7d'),
    argon2Pepper: z.string().min(32, 'ARGON2_PEPPER must be ≥ 32 chars'),
    totpIssuer: z.string().default('WDC Kaduna'),
  }),
  kms: z.object({
    dek: z.string().min(32, 'KMS_DEK must be ≥ 32 chars'),
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
    dbPoolMax: process.env.DB_POOL_MAX,
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
    auth: {
      jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
      jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
      jwtAccessTtl: process.env.JWT_ACCESS_TTL,
      jwtRefreshTtl: process.env.JWT_REFRESH_TTL,
      argon2Pepper: process.env.ARGON2_PEPPER,
      totpIssuer: process.env.TOTP_ISSUER,
    },
    kms: {
      dek: process.env.KMS_DEK,
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
