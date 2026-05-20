import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { REDIS_CLIENT } from '../../infra/redis/redis.module';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AskAiDto, AiResponseDto, AiQueryParams } from './ai.dto';
import * as queries from './queries';

interface RetrievalResult {
  sources: Array<{
    type: 'structured' | 'semantic';
    queryId?: string;
    embeddingId?: string;
    snippet: string;
  }>;
}

@Injectable()
export class AiService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async ask(dto: AskAiDto, params: AiQueryParams, actor: { userId: string; role: string; lgaId?: string; wardId?: string }): Promise<AiResponseDto> {
    const normalized = this.normalizeQuestion(dto.question);
    const cacheKey = this.buildCacheKey(normalized, actor);

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as AiResponseDto;
      return { ...parsed, cached: true };
    }

    const retrieval = await this.runRetrieval(normalized, params.limit, actor);

    const answer = await this.callAnthropic(dto.question, retrieval.sources);

    if (!this.validateCitations(answer, retrieval)) {
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role as 'secretary' | 'coordinator' | 'director' | 'system',
        eventKind: 'ai.ask.refused.bad_citation',
        targetTable: null,
        targetId: null,
        payload: { question: normalized, reason: 'citation_validation_failed' },
      });
      throw new Error('Response contains invalid citations');
    }

    if (retrieval.sources.length === 0) {
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role as 'secretary' | 'coordinator' | 'director' | 'system',
        eventKind: 'ai.ask.refused.no_data',
        targetTable: null,
        targetId: null,
        payload: { question: normalized },
      });
      throw new Error('No data available to answer the question');
    }

    const response: AiResponseDto = {
      answer,
      sources: retrieval.sources,
    };

    await this.redis.setex(cacheKey, 3600, JSON.stringify(response));

    await this.audit.append({
      actorUserId: actor.userId,
      actorRole: actor.role as 'secretary' | 'coordinator' | 'director' | 'system',
      eventKind: 'ai.ask.ok',
      targetTable: null,
      targetId: null,
      payload: { question: normalized, source_count: retrieval.sources.length },
    });

    return response;
  }

  private normalizeQuestion(q: string): string {
    return q.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private buildCacheKey(normalized: string, actor: { role: string; lgaId?: string; wardId?: string }): string {
    const scope = actor.lgaId || actor.wardId || 'state';
    const payload = `${normalized}||${actor.role}||${scope}`;
    const hash = createHash('sha256').update(payload).digest('hex');
    return `ai:cache:${hash}`;
  }

  private async runRetrieval(question: string, limit: number, actor: { lgaId?: string; wardId?: string }): Promise<RetrievalResult> {
    const sources: RetrievalResult['sources'] = [];

    const templates = [
      { name: 'lgaRatesForMonth', fn: () => queries.lgaRatesForMonth({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }) },
      { name: 'wardOutlierCount', fn: () => actor.lgaId ? queries.wardOutlierCount({ lgaId: actor.lgaId, days: 30 }) : null },
      { name: 'recentReports', fn: () => queries.recentReports({ limit: 10 }) },
      { name: 'userStats', fn: () => queries.userStats({ lgaId: actor.lgaId }) },
      { name: 'formDeploymentStats', fn: () => queries.formDeploymentStats() },
      { name: 'activeInvestigations', fn: () => queries.activeInvestigations() },
    ];

    for (const t of templates) {
      const template = t.fn();
      if (!template) continue;

      const result = await this.runStructuredQuery(template);
      if (result && result.rows.length > 0) {
        const snippet = this.formatSnippet(result.rows.slice(0, 3));
        sources.push({ type: 'structured', queryId: t.name, snippet });
      }
    }

    const semanticResults = await this.runSemanticRetrieval(question, limit);
    for (const r of semanticResults) {
      sources.push({ type: 'semantic', embeddingId: String(r.id), snippet: r.content.slice(0, 200) });
    }

    return { sources };
  }

  private async runStructuredQuery(template: { sql: string; params: unknown[] }): Promise<{ rows: Record<string, unknown>[] } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('SET LOCAL ROLE wdc_ro');
      const result = await client.query(template.sql, template.params);
      return { rows: result.rows };
    } catch {
      return null;
    } finally {
      client.release();
    }
  }

  private async runSemanticRetrieval(question: string, limit: number): Promise<Array<{ id: number; content: string }>> {
    const embedding = this.stubEmbedding(question);
    const client = await this.pool.connect();
    try {
      await client.query('SET LOCAL ROLE wdc_ro');
      const result = await client.query(
        `SELECT id, content FROM embeddings 
         ORDER BY embedding <=> $1::vector 
         LIMIT $2`,
        [JSON.stringify(embedding), limit],
      );
      return result.rows as Array<{ id: number; content: string }>;
    } catch {
      return [];
    } finally {
      client.release();
    }
  }

  private stubEmbedding(question: string): number[] {
    const hash = createHash('sha256').update(question).digest();
    return Array.from(hash).map((b) => (b / 255) * 2 - 1);
  }

  private async callAnthropic(question: string, sources: RetrievalResult['sources']): Promise<string> {
    const apiKey = this.config.get('anthropic.apiKey', { infer: true }) as string | undefined;
    if (!apiKey) {
      return this.stubResponse(question, sources);
    }

    const systemPrompt = `You are an assistant for the Kaduna State WDC Digital Reporting Platform.
You must cite your sources using the format: [source: structured#<query_id>] or [source: semantic#<embedding_id>]
Do not fabricate numbers or facts. If you don't know, say so.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.get('anthropic.model', { infer: true }) as string || 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            { role: 'user', content: `Question: ${question}\n\nAvailable data:\n${sources.map((s) => s.snippet).join('\n\n')}` },
          ],
        }),
      });

      if (!response.ok) {
        return this.stubResponse(question, sources);
      }

      const data = await response.json() as { content?: Array<{ text?: string }> };
      return data.content?.[0]?.text || this.stubResponse(question, sources);
    } catch {
      return this.stubResponse(question, sources);
    }
  }

  private stubResponse(question: string, sources: RetrievalResult['sources']): string {
    const q = question.toLowerCase();
    if (q.includes('report') || q.includes('lga')) {
      return `Based on the available data, here is what I found: ${sources.length} data sources were retrieved. [source: structured#recent_reports]`;
    }
    return `I found ${sources.length} relevant data sources for your question about "${question}".`;
  }

  private validateCitations(answer: string, retrieval: RetrievalResult): boolean {
    const citationRegex = /\[source: (structured|semantic)#(\w+)\]/g;
    const citations: string[] = [];
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      if (match[2]) citations.push(match[2]);
    }

    if (citations.length === 0) return true;

    const validStructured = new Set(retrieval.sources.filter((s) => s.type === 'structured').map((s) => s.queryId));
    const validSemantic = new Set(retrieval.sources.filter((s) => s.type === 'semantic').map((s) => s.embeddingId));

    for (const cite of citations) {
      if (!validStructured.has(cite) && !validSemantic.has(cite)) {
        return false;
      }
    }
    return true;
  }

  private formatSnippet(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const sample = rows[0];
    if (!sample) return '';
    const preview = Object.entries(sample)
      .filter(([, v]) => v !== null && v !== undefined)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`)
      .join(', ');
    return `${rows.length} rows. Sample: ${preview}`;
  }
}