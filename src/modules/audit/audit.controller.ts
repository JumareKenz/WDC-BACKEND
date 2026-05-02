import { Controller, Get, HttpCode, Inject, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction } from '../../common/rls/rls-context';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { AnchorService } from './anchor.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AnchorService) private readonly anchors: AnchorService,
  ) {}

  @Post('anchor')
  @Roles('director', 'system')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new audit anchor (director / scheduler)' })
  async anchor(): Promise<{
    created: boolean;
    id?: string;
    latestEventId?: string;
    latestHash?: string;
  }> {
    const out = await this.anchors.createAnchor();
    if (!out) return { created: false };
    return { created: true, id: out.id, latestEventId: out.latestEventId, latestHash: out.latestHash };
  }

  @Get('anchors')
  @Roles('director', 'system')
  @ApiOperation({ summary: 'List recent audit anchors (newest first)' })
  async listAnchors(
    @Req() req: AuthedRequest,
    @Query('limit') limitStr?: string,
  ): Promise<
    Array<{
      id: string;
      anchoredAt: string;
      latestEventId: string;
      latestHash: string;
      signatureAlg: string;
      signingKeyId: string;
      signature: string;
      verified: boolean;
    }>
  > {
    const limit = Math.min(Math.max(Number.parseInt(limitStr ?? '50', 10) || 50, 1), 500);
    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, rlsContextFromRequest(req), async (c) => {
        const r = await c.query<{
          id: string;
          anchored_at: Date;
          latest_event_id: string;
          latest_hash: string;
          signature_alg: string;
          signing_key_id: string;
          signature: string;
        }>(
          `SELECT id::text AS id, anchored_at, latest_event_id::text AS latest_event_id,
                  latest_hash, signature_alg, signing_key_id, signature
           FROM audit_anchors ORDER BY id DESC LIMIT $1`,
          [limit],
        );
        return r.rows;
      });
      return rows.map((row) => ({
        id: row.id,
        anchoredAt: row.anchored_at.toISOString(),
        latestEventId: row.latest_event_id,
        latestHash: row.latest_hash,
        signatureAlg: row.signature_alg,
        signingKeyId: row.signing_key_id,
        signature: row.signature,
        verified: this.anchors.verify({
          latestHash: row.latest_hash,
          signature: row.signature,
          signatureAlg: row.signature_alg,
        }),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Sealed CSV export. Streams audit events bounded by the most recent
   * anchor (so the export is provably complete up to that hash). The first
   * line is a `# anchor` preamble holding the anchor metadata; downstream
   * auditors can re-verify offline by recomputing each event's hash and
   * checking the signature on `latest_hash` against the stated signing key.
   */
  @Get('export')
  @Roles('director', 'system')
  @ApiOperation({ summary: 'Sealed CSV export bounded by the most recent anchor' })
  async export(@Req() req: AuthedRequest, @Res() res: Response): Promise<void> {
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(client, rlsContextFromRequest(req), async (c) => {
        const anchorRow = await c.query<{
          id: string;
          anchored_at: Date;
          latest_event_id: string;
          latest_hash: string;
          signature_alg: string;
          signing_key_id: string;
          signature: string;
        }>(
          `SELECT id::text AS id, anchored_at, latest_event_id::text AS latest_event_id,
                  latest_hash, signature_alg, signing_key_id, signature
           FROM audit_anchors ORDER BY id DESC LIMIT 1`,
        );
        const anchor = anchorRow.rows[0];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        );

        if (!anchor) {
          res.write('# anchor: NONE — audit log is empty\n');
          res.write('id,occurred_at,actor_user_id,actor_role,event_kind,target_table,target_id,prev_hash,hash\n');
          res.end();
          return;
        }

        const verified = this.anchors.verify({
          latestHash: anchor.latest_hash,
          signature: anchor.signature,
          signatureAlg: anchor.signature_alg,
        });

        res.write(`# anchor.id: ${anchor.id}\n`);
        res.write(`# anchor.anchored_at: ${anchor.anchored_at.toISOString()}\n`);
        res.write(`# anchor.latest_event_id: ${anchor.latest_event_id}\n`);
        res.write(`# anchor.latest_hash: ${anchor.latest_hash}\n`);
        res.write(`# anchor.signature_alg: ${anchor.signature_alg}\n`);
        res.write(`# anchor.signing_key_id: ${anchor.signing_key_id}\n`);
        res.write(`# anchor.signature: ${anchor.signature}\n`);
        res.write(`# anchor.verified_now: ${verified}\n`);
        res.write(
          'id,occurred_at,actor_user_id,actor_role,event_kind,target_table,target_id,prev_hash,hash\n',
        );

        // Stream rows up to the anchor's latest_event_id.
        const cursor = await c.query<{
          id: string;
          occurred_at: Date;
          actor_user_id: string | null;
          actor_role: string;
          event_kind: string;
          target_table: string | null;
          target_id: string | null;
          prev_hash: string;
          hash: string;
        }>(
          `SELECT id::text AS id, occurred_at, actor_user_id, actor_role,
                  event_kind, target_table, target_id, prev_hash, hash
           FROM audit_events WHERE id <= $1 ORDER BY id ASC`,
          [anchor.latest_event_id],
        );
        for (const row of cursor.rows) {
          res.write(
            [
              row.id,
              row.occurred_at.toISOString(),
              row.actor_user_id ?? '',
              csv(row.actor_role),
              csv(row.event_kind),
              csv(row.target_table ?? ''),
              csv(row.target_id ?? ''),
              row.prev_hash,
              row.hash,
            ].join(',') + '\n',
          );
        }
        res.end();
      });
    } finally {
      client.release();
    }
  }
}

function csv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
