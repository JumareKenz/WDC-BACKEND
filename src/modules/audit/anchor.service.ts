import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction } from '../../common/rls/rls-context';
import type { AppConfig } from '../../config/configuration';

/**
 * Anchors the hash chain.
 *
 * The audit log is hash-chained per row. An anchor signs the hash of the
 * latest known event with a long-lived asymmetric key and stores the
 * signature in `audit_anchors`. Verification of the chain becomes:
 *   1. fetch the latest anchor;
 *   2. recompute audit_events[…latest_event_id].hash from the canonical
 *      JSON of each event (chain integrity);
 *   3. verify the signature on `latest_hash` against the anchor's
 *      `signing_key_id` public key (anchor authenticity).
 *
 * M11 reuses the JWT RSA private key for signing — operationally simpler
 * than a separate key while we're in dev. ADR-006 captures the dev/prod
 * trade-off; production should use a dedicated KMS-managed key per RUNBOOK
 * §4.
 */
@Injectable()
export class AnchorService implements OnModuleInit {
  private privateKey!: Buffer;
  private publicKey!: Buffer;
  private readonly signingKeyId = 'jwt-dev';
  private readonly signatureAlg = 'rsa-sha256';

  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    const auth = this.config.get('auth', { infer: true });
    this.privateKey = readFileSync(resolve(process.cwd(), auth.jwtPrivateKeyPath));
    this.publicKey = readFileSync(resolve(process.cwd(), auth.jwtPublicKeyPath));
  }

  /**
   * Sign the latest event's hash and persist an anchor row. Returns null
   * when the audit log is empty (no genesis event yet) — the caller should
   * treat this as a no-op, not an error.
   */
  async createAnchor(): Promise<{ id: string; latestEventId: string; latestHash: string } | null> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const latest = await c.query<{ id: string; hash: string }>(
            `SELECT id::text AS id, hash FROM audit_events ORDER BY id DESC LIMIT 1`,
          );
          const row = latest.rows[0];
          if (!row) return null;

          const signature = sign(this.privateKey, row.hash);
          const inserted = await c.query<{ id: string }>(
            `INSERT INTO audit_anchors
               (latest_event_id, latest_hash, signature_alg, signing_key_id, signature)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::text AS id`,
            [row.id, row.hash, this.signatureAlg, this.signingKeyId, signature],
          );
          const anchor = inserted.rows[0];
          if (!anchor) throw new Error('audit_anchors INSERT returned no row');
          return { id: anchor.id, latestEventId: row.id, latestHash: row.hash };
        },
      );
    } finally {
      client.release();
    }
  }

  /**
   * Verify a stored anchor's signature against the public key. Used by the
   * sealed CSV export to attach a verifier preamble that downstream auditors
   * can re-check offline.
   */
  verify(anchor: { latestHash: string; signature: string; signatureAlg: string }): boolean {
    if (anchor.signatureAlg !== this.signatureAlg) return false;
    return verify(this.publicKey, anchor.latestHash, anchor.signature);
  }

  publicKeyPem(): string {
    return this.publicKey.toString('utf8');
  }

  signingKeyIdValue(): string {
    return this.signingKeyId;
  }

  signatureAlgValue(): string {
    return this.signatureAlg;
  }
}

function sign(privateKey: Buffer, payload: string): string {
  const s = createSign('SHA256');
  s.update(payload);
  s.end();
  return s.sign(privateKey).toString('base64url');
}

function verify(publicKey: Buffer, payload: string, signature: string): boolean {
  try {
    const v = createVerify('SHA256');
    v.update(payload);
    v.end();
    return v.verify(publicKey, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}
