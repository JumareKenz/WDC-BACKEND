import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('M16 i18n keys', () => {
  it('has all M16 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'messages.newBroadcast',
      'messages.recipients',
      'messages.channels',
      'messages.channel.inApp',
      'messages.channel.email',
      'messages.channel.sms',
      'messages.channel.whatsapp',
      'messages.subject',
      'messages.body',
      'messages.send',
      'messages.sent',
      'messages.history',
      'messages.columns.sentAt',
      'messages.columns.recipients',
      'messages.columns.channel',
      'messages.columns.status',
      'audit.title',
      'audit.exportCsv',
      'audit.columns.timestamp',
      'audit.columns.actor',
      'audit.columns.action',
      'audit.columns.resource',
      'audit.columns.details',
      'audit.filterAll',
      'audit.filterCreate',
      'audit.filterUpdate',
      'audit.filterDelete',
      'audit.filterSeal',
      'audit.sealed',
      'analytics.title',
      'analytics.submissionsOverTime',
      'analytics.byLga',
      'analytics.byMethod',
      'analytics.approvalRate',
      'analytics.responseTime',
      'analytics.period.week',
      'analytics.period.month',
      'analytics.period.quarter',
      'analytics.period.year',
      'settings.general',
      'settings.notifications',
      'settings.security',
      'settings.theme',
      'settings.theme.light',
      'settings.theme.dark',
      'settings.save',
      'settings.saved',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M16 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'messages.title',
      'audit.title',
      'analytics.title',
      'settings.title',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('M16 mock data', () => {
  it('has broadcasts with valid channels', async () => {
    const { mockBroadcasts } = await import('./lib/mock-data-tables');
    expect(mockBroadcasts.length).toBeGreaterThan(0);
    for (const b of mockBroadcasts) {
      expect(b.channels.length).toBeGreaterThan(0);
      expect(['delivered', 'pending', 'failed']).toContain(b.status);
    }
  });

  it('has audit logs with valid actions', async () => {
    const { mockAuditLogs } = await import('./lib/mock-data-tables');
    expect(mockAuditLogs.length).toBeGreaterThan(0);
    for (const a of mockAuditLogs) {
      expect(['create', 'update', 'delete', 'seal']).toContain(a.action);
    }
  });

  it('has analytics periods', async () => {
    const { mockAnalyticsPeriods } = await import('./lib/mock-dashboard');
    expect(mockAnalyticsPeriods.length).toBeGreaterThan(0);
  });

  it('has analytics by method', async () => {
    const { mockAnalyticsByMethod } = await import('./lib/mock-dashboard');
    expect(mockAnalyticsByMethod.length).toBe(3);
    const methods = mockAnalyticsByMethod.map((m) => m.method);
    expect(methods).toContain('wizard');
    expect(methods).toContain('amira');
    expect(methods).toContain('snap');
  });
});

describe('M16 page files exist', () => {
  const root = path.resolve(__dirname, '..');

  it('has messages page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'messages', 'page.tsx'))).toBe(true);
  });

  it('has audit page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'audit', 'page.tsx'))).toBe(true);
  });

  it('has analytics page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'analytics', 'page.tsx'))).toBe(true);
  });

  it('has settings page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'settings', 'page.tsx'))).toBe(true);
  });
});
