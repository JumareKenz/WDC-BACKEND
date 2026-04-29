import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/configuration';

const requiredEnv = {
  DATABASE_URL: 'postgres://wdc:wdc@localhost:5433/wdc',
  REDIS_URL: 'redis://localhost:6380',
  S3_ENDPOINT: 'http://localhost:9100',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin',
  S3_BUCKET: 'wdc-artefacts',
  JWT_PRIVATE_KEY_PATH: './secrets/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: './secrets/jwt-public.pem',
  ARGON2_PEPPER: 'a'.repeat(32),
  KMS_DEK: 'k'.repeat(32),
};

describe('loadConfig', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const k of Object.keys(requiredEnv)) delete process.env[k];
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    Object.assign(process.env, requiredEnv);
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('parses with all required env vars set', () => {
    const cfg = loadConfig();
    expect(cfg.databaseUrl).toBe(requiredEnv.DATABASE_URL);
    expect(cfg.redisUrl).toBe(requiredEnv.REDIS_URL);
    expect(cfg.s3.endpoint).toBe(requiredEnv.S3_ENDPOINT);
    expect(cfg.port).toBe(3000);
    expect(cfg.reports.sealGraceDays).toBe(7);
  });

  it('throws a structured error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => loadConfig()).toThrow(/databaseUrl/);
  });

  it('coerces PORT from string env to number', () => {
    process.env.PORT = '4000';
    expect(loadConfig().port).toBe(4000);
  });

  it('rejects an unknown LOG_LEVEL value', () => {
    process.env.LOG_LEVEL = 'verbose';
    expect(() => loadConfig()).toThrow(/logLevel/);
  });
});
