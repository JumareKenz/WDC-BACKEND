/**
 * Seed the 23 LGAs and 255 ward stubs for Kaduna State.
 *
 * LGA names are the real 23 Kaduna LGAs. Ward names are placeholder stubs
 * (`<lga-slug>-w01`, `<lga-slug>-w02`, ...) sized per-LGA from a published
 * count distribution. The user has flagged that real ward names will be
 * supplied as a CSV — see ARCHITECTURE.md §10 assumption #1. When that CSV
 * lands, this script is replaced; until then the count and shape are correct.
 *
 * Idempotent: re-runs upsert on (code) and skip if row exists.
 *
 * Usage: pnpm seed (DATABASE_URL must be set; runs as the wdc superuser, so
 * RLS is in force but the wdc user has bypassrls=false; we set role=system
 * for the seed transaction).
 */
import { Pool } from 'pg';
import { withRlsTransaction } from '../src/common/rls/rls-context';

interface LgaSeed {
  code: string;
  name: string;
  nameHa: string;
  wardCount: number;
}

// 23 Kaduna LGAs with their canonical English / Hausa names and ward counts.
// Counts sum to 255.
const LGAS: LgaSeed[] = [
  { code: 'BIR', name: 'Birnin Gwari',       nameHa: 'Birnin Gwari',      wardCount: 11 },
  { code: 'CHI', name: 'Chikun',             nameHa: 'Chikun',             wardCount: 12 },
  { code: 'GIW', name: 'Giwa',               nameHa: 'Giwa',               wardCount: 11 },
  { code: 'IGA', name: 'Igabi',              nameHa: 'Igabi',              wardCount: 11 },
  { code: 'IKA', name: 'Ikara',              nameHa: 'Ikara',              wardCount: 10 },
  { code: 'JAB', name: 'Jaba',               nameHa: 'Jaba',               wardCount: 10 },
  { code: 'JEM', name: "Jema'a",             nameHa: "Jema'a",             wardCount: 12 },
  { code: 'KCT', name: 'Kachia',             nameHa: 'Kachia',             wardCount: 10 },
  { code: 'KDN', name: 'Kaduna North',       nameHa: 'Arewacin Kaduna',    wardCount: 13 },
  { code: 'KDS', name: 'Kaduna South',       nameHa: 'Kudancin Kaduna',    wardCount: 12 },
  { code: 'KAG', name: 'Kagarko',            nameHa: 'Kagarko',            wardCount: 10 },
  { code: 'KAJ', name: 'Kajuru',             nameHa: 'Kajuru',             wardCount: 10 },
  { code: 'KAU', name: 'Kaura',              nameHa: 'Kaura',              wardCount: 11 },
  { code: 'KAW', name: 'Kauru',              nameHa: 'Kauru',              wardCount: 11 },
  { code: 'KUB', name: 'Kubau',              nameHa: 'Kubau',              wardCount: 11 },
  { code: 'KUD', name: 'Kudan',              nameHa: 'Kudan',              wardCount: 10 },
  { code: 'LRE', name: 'Lere',               nameHa: 'Lere',               wardCount: 12 },
  { code: 'MAK', name: "Makarfi",            nameHa: 'Makarfi',            wardCount: 11 },
  { code: 'SAB', name: 'Sabon Gari',         nameHa: 'Sabon Gari',         wardCount: 11 },
  { code: 'SAN', name: 'Sanga',              nameHa: 'Sanga',              wardCount: 10 },
  { code: 'SOB', name: 'Soba',               nameHa: 'Soba',               wardCount: 11 },
  { code: 'ZAN', name: 'Zangon Kataf',       nameHa: 'Zangon Kataf',       wardCount: 11 },
  { code: 'ZAR', name: 'Zaria',              nameHa: 'Zariya',             wardCount: 14 },
];

function totalWards(): number {
  return LGAS.reduce((acc, l) => acc + l.wardCount, 0);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const total = totalWards();
  if (total !== 255) {
    process.stderr.write(`refusing to seed: ward count is ${total}, expected 255\n`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await withRlsTransaction(
      client,
      { userId: null, role: 'system', lgaId: null, wardId: null },
      async (c) => {
        let lgaInserted = 0;
        let wardInserted = 0;

        for (const lga of LGAS) {
          const lgaRes = await c.query<{ id: string; existed: boolean }>(
            `INSERT INTO lgas (code, name, name_ha)
             VALUES ($1, $2, $3)
             ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_ha = EXCLUDED.name_ha
             RETURNING id, (xmax <> 0) AS existed`,
            [lga.code, lga.name, lga.nameHa],
          );
          const lgaId = lgaRes.rows[0]!.id;
          if (!lgaRes.rows[0]!.existed) lgaInserted++;

          for (let i = 1; i <= lga.wardCount; i++) {
            const code = `${lga.code}-W${String(i).padStart(2, '0')}`;
            const stubName = `${lga.name} Ward ${i}`;
            const stubHa = `Sashen ${lga.nameHa} ${i}`;
            const wardRes = await c.query(
              `INSERT INTO wards (lga_id, code, name, name_ha)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (lga_id, code) DO NOTHING`,
              [lgaId, code, stubName, stubHa],
            );
            wardInserted += wardRes.rowCount ?? 0;
          }
        }

        process.stdout.write(
          `seed ok — ${LGAS.length} LGAs (${lgaInserted} new), ${total} wards target (${wardInserted} new)\n`,
        );
      },
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`seed failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
