import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { z } from 'zod';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type RlsContext } from '../../common/rls/rls-context';
import { AuditService } from '../audit/audit.service';
import { parseFormSchema } from './form-schema';

type Status = 'draft' | 'deployed' | 'archived';
type ScopeKind = 'state' | 'lga' | 'ward';

interface FormRow {
  id: string;
  slug: string;
  title: string;
  title_ha: string;
  scope_kind: ScopeKind;
  scope_ids: string[];
  status: Status;
  current_version_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface VersionRow {
  id: string;
  form_id: string;
  version_number: number;
  schema: Record<string, unknown>;
  deployed_at: Date | null;
  deployed_by: string | null;
  created_at: Date;
}

export interface FormView {
  id: string;
  slug: string;
  title: string;
  titleHa: string;
  scopeKind: ScopeKind;
  scopeIds: string[];
  status: Status;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormVersionView {
  id: string;
  formId: string;
  versionNumber: number;
  schema: Record<string, unknown>;
  deployedAt: string | null;
  deployedBy: string | null;
  createdAt: string;
}

@Injectable()
export class FormsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(args: {
    actor: RlsContext;
    slug: string;
    title: string;
    titleHa: string;
    scopeKind: ScopeKind;
    scopeIds?: string[];
    requestId: string | null;
  }): Promise<FormView> {
    requireDirector(args.actor);
    validateScope(args.scopeKind, args.scopeIds);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, args.actor, async (c) => {
        try {
          const r = await c.query<FormRow>(
            `INSERT INTO forms (slug, title, title_ha, scope_kind, scope_ids, status, created_by)
             VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', $6)
             RETURNING id, slug, title, title_ha, scope_kind, scope_ids, status,
                       current_version_id, created_by, created_at, updated_at`,
            [
              args.slug,
              args.title,
              args.titleHa,
              args.scopeKind,
              JSON.stringify(args.scopeIds ?? []),
              args.actor.userId,
            ],
          );
          const out = r.rows[0];
          if (!out) throw new Error('forms INSERT returned no row');
          return out;
        } catch (e) {
          if (/forms_slug_uk/.test((e as Error).message)) {
            throw new ConflictException('a form with this slug already exists');
          }
          throw e;
        }
      });
      const view = toFormView(row);
      await this.audit.append({
        actorUserId: args.actor.userId,
        actorRole: args.actor.role,
        eventKind: 'forms.created',
        targetTable: 'forms',
        targetId: view.id,
        payload: { slug: view.slug, scope_kind: view.scopeKind },
        requestId: args.requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async list(actor: RlsContext): Promise<FormView[]> {
    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<FormRow>(
          `SELECT id, slug, title, title_ha, scope_kind, scope_ids, status,
                  current_version_id, created_by, created_at, updated_at
           FROM forms ORDER BY created_at DESC`,
        );
        return r.rows;
      });
      return rows.map(toFormView);
    } finally {
      client.release();
    }
  }

  async getById(actor: RlsContext, id: string): Promise<FormView> {
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<FormRow>(
          `SELECT id, slug, title, title_ha, scope_kind, scope_ids, status,
                  current_version_id, created_by, created_at, updated_at
           FROM forms WHERE id = $1`,
          [id],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('form not found');
        return out;
      });
      return toFormView(row);
    } finally {
      client.release();
    }
  }

  async update(
    actor: RlsContext,
    id: string,
    patch: { title?: string; titleHa?: string; scopeKind?: ScopeKind; scopeIds?: string[] },
    requestId: string | null,
  ): Promise<FormView> {
    requireDirector(actor);
    if (patch.scopeKind !== undefined || patch.scopeIds !== undefined) {
      // If either scope field is being touched, validate the resulting pair.
      // For convenience we allow patching just one — the other is read from
      // the existing row inside the same txn.
    }
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const sets: string[] = [];
        const params: unknown[] = [];

        if (patch.title !== undefined) {
          params.push(patch.title);
          sets.push(`title = $${params.length}`);
        }
        if (patch.titleHa !== undefined) {
          params.push(patch.titleHa);
          sets.push(`title_ha = $${params.length}`);
        }
        if (patch.scopeKind !== undefined || patch.scopeIds !== undefined) {
          const existing = await c.query<{ scope_kind: ScopeKind; scope_ids: string[] }>(
            `SELECT scope_kind, scope_ids FROM forms WHERE id = $1`,
            [id],
          );
          const ex = existing.rows[0];
          if (!ex) throw new NotFoundException('form not found');
          const newKind = patch.scopeKind ?? ex.scope_kind;
          const newIds = patch.scopeIds ?? ex.scope_ids;
          validateScope(newKind, newIds);
          if (patch.scopeKind !== undefined) {
            params.push(newKind);
            sets.push(`scope_kind = $${params.length}`);
          }
          if (patch.scopeIds !== undefined) {
            params.push(JSON.stringify(newIds));
            sets.push(`scope_ids = $${params.length}::jsonb`);
          }
        }
        if (sets.length === 0) throw new BadRequestException('no changes specified');

        params.push(id);
        const r = await c.query<FormRow>(
          `UPDATE forms SET ${sets.join(', ')}
           WHERE id = $${params.length}
           RETURNING id, slug, title, title_ha, scope_kind, scope_ids, status,
                     current_version_id, created_by, created_at, updated_at`,
          params,
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('form not found');
        return out;
      });
      const view = toFormView(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'forms.updated',
        targetTable: 'forms',
        targetId: view.id,
        payload: { fields: Object.keys(patch) },
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async createVersion(
    actor: RlsContext,
    formId: string,
    schema: unknown,
    requestId: string | null,
  ): Promise<FormVersionView> {
    requireDirector(actor);
    let parsed;
    try {
      parsed = parseFormSchema(schema);
    } catch (e) {
      const err = e as z.ZodError;
      throw new BadRequestException({
        message: 'invalid form schema',
        errors: err.errors.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const form = await c.query<{ id: string }>(`SELECT id FROM forms WHERE id = $1`, [formId]);
        if (form.rows.length === 0) throw new NotFoundException('form not found');

        const next = await c.query<{ next: number }>(
          `SELECT COALESCE(MAX(version_number), 0) + 1 AS next
           FROM form_versions WHERE form_id = $1`,
          [formId],
        );
        const nextRow = next.rows[0];
        if (!nextRow) throw new Error('next-version COALESCE returned no row');
        const versionNumber = nextRow.next;
        const r = await c.query<VersionRow>(
          `INSERT INTO form_versions (form_id, version_number, schema)
           VALUES ($1, $2, $3::jsonb)
           RETURNING id, form_id, version_number, schema, deployed_at, deployed_by, created_at`,
          [formId, versionNumber, JSON.stringify(parsed)],
        );
        const out = r.rows[0];
        if (!out) throw new Error('form_versions INSERT returned no row');
        return out;
      });
      const view = toVersionView(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'forms.versioned',
        targetTable: 'form_versions',
        targetId: view.id,
        payload: { form_id: view.formId, version_number: view.versionNumber },
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async listVersions(actor: RlsContext, formId: string): Promise<FormVersionView[]> {
    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<VersionRow>(
          `SELECT id, form_id, version_number, schema, deployed_at, deployed_by, created_at
           FROM form_versions WHERE form_id = $1 ORDER BY version_number DESC`,
          [formId],
        );
        return r.rows;
      });
      return rows.map(toVersionView);
    } finally {
      client.release();
    }
  }

  async getVersion(
    actor: RlsContext,
    formId: string,
    versionNumber: number,
  ): Promise<FormVersionView> {
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<VersionRow>(
          `SELECT id, form_id, version_number, schema, deployed_at, deployed_by, created_at
           FROM form_versions WHERE form_id = $1 AND version_number = $2`,
          [formId, versionNumber],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('form version not found');
        return out;
      });
      return toVersionView(row);
    } finally {
      client.release();
    }
  }

  /**
   * Deploy the latest draft version. Marks `form_versions.deployed_at` and
   * `deployed_by`, sets `forms.current_version_id` and `forms.status='deployed'`.
   * Once `deployed_at` is set, the immutability trigger blocks any further
   * UPDATE/DELETE on that row.
   */
  async deploy(actor: RlsContext, formId: string, requestId: string | null): Promise<FormView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const latest = await c.query<{ id: string; version_number: number; deployed_at: Date | null }>(
          `SELECT id, version_number, deployed_at
           FROM form_versions WHERE form_id = $1
           ORDER BY version_number DESC LIMIT 1`,
          [formId],
        );
        const ver = latest.rows[0];
        if (!ver) throw new BadRequestException('form has no versions to deploy');
        if (ver.deployed_at) {
          throw new ConflictException('latest version is already deployed');
        }

        await c.query(
          `UPDATE form_versions SET deployed_at = now(), deployed_by = $1 WHERE id = $2`,
          [actor.userId, ver.id],
        );
        const r = await c.query<FormRow>(
          `UPDATE forms SET current_version_id = $1, status = 'deployed' WHERE id = $2
           RETURNING id, slug, title, title_ha, scope_kind, scope_ids, status,
                     current_version_id, created_by, created_at, updated_at`,
          [ver.id, formId],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('form not found');
        return out;
      });
      const view = toFormView(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'forms.deployed',
        targetTable: 'forms',
        targetId: view.id,
        payload: { current_version_id: view.currentVersionId },
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async archive(actor: RlsContext, formId: string, requestId: string | null): Promise<FormView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<FormRow>(
          `UPDATE forms SET status = 'archived' WHERE id = $1
           RETURNING id, slug, title, title_ha, scope_kind, scope_ids, status,
                     current_version_id, created_by, created_at, updated_at`,
          [formId],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('form not found');
        return out;
      });
      const view = toFormView(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'forms.archived',
        targetTable: 'forms',
        targetId: view.id,
        payload: {},
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  /**
   * Forms a caller can fill, computed from their RLS context.
   *   - state-scope forms: visible to everyone authenticated
   *   - lga-scope forms: visible if the caller's lga_id is in scope_ids
   *   - ward-scope forms: visible if the caller's ward_id is in scope_ids
   * Only `deployed` forms appear here — drafts and archived are excluded.
   */
  async listVisible(actor: RlsContext): Promise<FormView[]> {
    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<FormRow>(
          `SELECT id, slug, title, title_ha, scope_kind, scope_ids, status,
                  current_version_id, created_by, created_at, updated_at
           FROM forms
           WHERE status = 'deployed'
             AND (
               scope_kind = 'state'
               OR (scope_kind = 'lga'  AND scope_ids ? $1::text)
               OR (scope_kind = 'ward' AND scope_ids ? $2::text)
             )
           ORDER BY title ASC`,
          [actor.lgaId ?? '', actor.wardId ?? ''],
        );
        return r.rows;
      });
      return rows.map(toFormView);
    } finally {
      client.release();
    }
  }
}

function requireDirector(actor: RlsContext): void {
  if (actor.role !== 'director') {
    throw new ForbiddenException('director role required for this action');
  }
}

function validateScope(kind: 'state' | 'lga' | 'ward', ids?: string[]): void {
  if (kind === 'state') {
    if (ids && ids.length > 0) {
      throw new BadRequestException('scopeIds must be empty for state-wide forms');
    }
    return;
  }
  if (!ids || ids.length === 0) {
    throw new BadRequestException(`scopeIds is required and non-empty for scope=${kind}`);
  }
}

function toFormView(row: FormRow): FormView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleHa: row.title_ha,
    scopeKind: row.scope_kind,
    scopeIds: row.scope_ids,
    status: row.status,
    currentVersionId: row.current_version_id,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toVersionView(row: VersionRow): FormVersionView {
  return {
    id: row.id,
    formId: row.form_id,
    versionNumber: row.version_number,
    schema: row.schema,
    deployedAt: row.deployed_at?.toISOString() ?? null,
    deployedBy: row.deployed_by,
    createdAt: row.created_at.toISOString(),
  };
}
