import type { PoolClient } from 'pg';

/**
 * Encrypt a plaintext string into a bytea via pgcrypto's pgp_sym_encrypt
 * using the session-level `app.dek` GUC. The DEK is set at the start of
 * every withRlsTransaction-bound request.
 *
 * Returns a Buffer suitable for inserting into a `bytea` column.
 */
export async function pgcryptoEncrypt(client: PoolClient, plaintext: string): Promise<Buffer> {
  const r = await client.query<{ ct: Buffer }>(
    `SELECT pgp_sym_encrypt($1, current_setting('app.dek')) AS ct`,
    [plaintext],
  );
  const row = r.rows[0];
  if (!row) throw new Error('pgcryptoEncrypt: no row returned');
  return row.ct;
}

export async function pgcryptoDecrypt(client: PoolClient, ciphertext: Buffer): Promise<string> {
  const r = await client.query<{ pt: string }>(
    `SELECT pgp_sym_decrypt($1::bytea, current_setting('app.dek')) AS pt`,
    [ciphertext],
  );
  const row = r.rows[0];
  if (!row) throw new Error('pgcryptoDecrypt: no row returned');
  return row.pt;
}
