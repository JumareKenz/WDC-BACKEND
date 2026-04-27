import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infra/postgres/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://wdc:wdc@localhost:5433/wdc',
  },
  strict: true,
  verbose: true,
});
