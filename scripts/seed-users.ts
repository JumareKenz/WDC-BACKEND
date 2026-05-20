/**
 * Seed demo users for local development.
 *
 * Creates one user per role with known PINs/passwords so you can log in
 * without going through the enrolment flow:
 *
 *   Secretary:   +2348011111111  PIN: 111111
 *   Coordinator: +2348022222222  PIN: 222222
 *   Director:    director@wdc.kaduna.gov.ng  Password: Director123!xx
 *
 * Prerequisites:
 *   - DATABASE_URL set (or .env.local loaded)
 *   - LGAs and wards seeded (run `pnpm seed` first)
 *   - ARGON2_PEPPER set (same as backend uses)
 *
 * Idempotent: skips if phone_hash already exists.
 *
 * Usage: npx tsx scripts/seed-users.ts
 */
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const PEPPER = process.env.ARGON2_PEPPER ?? 'change-me-in-prod-32-bytes-minimum-xxxxx';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local');
  process.exit(1);
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin + PEPPER, {
    type: argon2.argon2id,
    memoryCost: 1 << 16,
    timeCost: 3,
    parallelism: 1,
  });
}

interface DemoUser {
  role: 'secretary' | 'coordinator' | 'director';
  fullName: string;
  phone: string;
  email?: string;
  pin?: string;
  password?: string;
  lgaCode: string;
  wardCode?: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    role: 'secretary',
    fullName: 'Amina Yusuf',
    phone: '+2348011111111',
    pin: '111111',
    lgaCode: 'CHI',
    wardCode: 'CHI-W01',
  },
  {
    role: 'coordinator',
    fullName: 'Ibrahim Musa',
    phone: '+2348022222222',
    pin: '222222',
    lgaCode: 'CHI',
  },
  {
    role: 'director',
    fullName: 'Dr. Fatima Bello',
    phone: '+2348033333333',
    email: 'director@wdc.kaduna.gov.ng',
    password: 'Director123!xx',
    lgaCode: 'KDN',
  },
];

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL role = 'wdc'`);
    await client.query(`SELECT set_config('app.user_id', '', true)`);
    await client.query(`SELECT set_config('app.user_role', 'system', true)`);

    let created = 0;
    let skipped = 0;

    for (const user of DEMO_USERS) {
      const phoneHash = sha256(user.phone);

      // Check if already exists
      const existing = await client.query(
        'SELECT id FROM users WHERE phone_hash = $1',
        [phoneHash],
      );
      if (existing.rows.length > 0) {
        console.log(`  skip: ${user.role} ${user.phone} (already exists)`);
        skipped++;
        continue;
      }

      // Resolve LGA and ward IDs
      const lgaRes = await client.query<{ id: string }>(
        'SELECT id FROM lgas WHERE code = $1',
        [user.lgaCode],
      );
      if (lgaRes.rows.length === 0) {
        console.error(`  ERROR: LGA ${user.lgaCode} not found. Run 'pnpm seed' first.`);
        continue;
      }
      const lgaId = lgaRes.rows[0]!.id;

      let wardId: string | null = null;
      if (user.wardCode) {
        const wardRes = await client.query<{ id: string }>(
          'SELECT id FROM wards WHERE code = $1 AND lga_id = $2',
          [user.wardCode, lgaId],
        );
        if (wardRes.rows.length > 0) {
          wardId = wardRes.rows[0]!.id;
        }
      }

      // Hash credentials
      let pinHash: string | null = null;
      let passwordHash: string | null = null;
      if (user.pin) {
        pinHash = await hashPin(user.pin);
      }
      if (user.password) {
        passwordHash = await hashPin(user.password);
      }

      // For dev, we store plain text in ciphertext columns (no KMS in dev)
      const nameBuf = Buffer.from(user.fullName, 'utf8');
      const phoneBuf = Buffer.from(user.phone, 'utf8');
      const emailHash = user.email ? sha256(user.email) : null;
      const emailBuf = user.email ? Buffer.from(user.email, 'utf8') : null;

      await client.query(
        `INSERT INTO users (
          role, full_name_ciphertext, phone_hash, phone_ciphertext,
          email_hash, email_ciphertext, pin_hash, password_hash,
          lga_id, ward_id, key_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          user.role,
          nameBuf,
          phoneHash,
          phoneBuf,
          emailHash,
          emailBuf,
          pinHash,
          passwordHash,
          lgaId,
          wardId,
          'kid-dev',
          'active',
        ],
      );

      console.log(`  created: ${user.role} ${user.phone} (PIN: ${user.pin ?? 'N/A'})`);
      created++;
    }

    await client.query('COMMIT');
    console.log(`\nDone: ${created} created, ${skipped} skipped.\n`);
    console.log('Login credentials:');
    console.log('─────────────────────────────────────────────────────');
    console.log('  Secretary:   Phone: +2348011111111   PIN: 111111');
    console.log('  Coordinator: Phone: +2348022222222   PIN: 222222');
    console.log('  Director:    Email: director@wdc.kaduna.gov.ng');
    console.log('               Password: Director123!xx');
    console.log('─────────────────────────────────────────────────────');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('seed-users failed:', (err as Error).message);
  process.exit(1);
});
