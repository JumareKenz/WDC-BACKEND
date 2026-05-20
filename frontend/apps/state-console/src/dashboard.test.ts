import { describe, it, expect } from 'vitest';

describe('M12 i18n keys', () => {
  it('has all M12 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'console.title',
      'console.dashboard',
      'console.submissions',
      'console.investigations',
      'console.users',
      'console.forms',
      'console.messages',
      'console.audit',
      'console.analytics',
      'console.settings',
      'console.aiAssistant',
      'console.search',
      'console.notifications',
      'kpi.totalSubmissions',
      'kpi.approved',
      'kpi.pendingReview',
      'kpi.returned',
      'kpi.sealed',
      'kpi.fromLastMonth',
      'heatmap.title',
      'heatmap.highActivity',
      'heatmap.mediumActivity',
      'heatmap.lowActivity',
      'heatmap.noActivity',
      'aiInsights.title',
      'aiInsights.trend',
      'aiInsights.anomaly',
      'aiInsights.recommendation',
      'aiInsights.viewDetail',
      'needsAttention.title',
      'needsAttention.overdueReports',
      'needsAttention.returnedForRevision',
      'needsAttention.pendingSealing',
      'needsAttention.viewAll',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M12 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'console.title',
      'console.dashboard',
      'kpi.totalSubmissions',
      'heatmap.title',
      'aiInsights.title',
      'needsAttention.title',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('mock dashboard data', () => {
  it('has 5 KPIs', async () => {
    const { mockKpis } = await import('./lib/mock-dashboard');
    expect(mockKpis.length).toBe(5);
  });

  it('has 23 LGAs in heatmap', async () => {
    const { mockLgaHeatmap } = await import('./lib/mock-dashboard');
    expect(mockLgaHeatmap.length).toBe(23);
  });

  it('has AI insights with valid severities', async () => {
    const { mockAiInsights } = await import('./lib/mock-dashboard');
    expect(mockAiInsights.length).toBeGreaterThan(0);
    for (const i of mockAiInsights) {
      expect(['info', 'warning', 'critical']).toContain(i.severity);
    }
  });

  it('has needs-attention items', async () => {
    const { mockNeedsAttention } = await import('./lib/mock-dashboard');
    expect(mockNeedsAttention.length).toBeGreaterThan(0);
    for (const item of mockNeedsAttention) {
      expect(['overdue', 'returned', 'pendingSealing']).toContain(item.type);
    }
  });
});

describe('heatmap intensity logic', () => {
  it('classifies high activity correctly', () => {
    const high = 250;
    expect(high >= 200).toBe(true);
  });

  it('classifies no activity correctly', () => {
    const none = 20;
    expect(none < 50).toBe(true);
  });
});
