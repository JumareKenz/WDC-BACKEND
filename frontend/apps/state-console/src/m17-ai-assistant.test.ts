import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('M17 i18n keys', () => {
  it('has all M17 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'ai.title',
      'ai.placeholder',
      'ai.send',
      'ai.capabilities',
      'ai.capability.summarize',
      'ai.capability.compare',
      'ai.capability.anomaly',
      'ai.capability.recommend',
      'ai.recentPrompts',
      'ai.citation.report',
      'ai.citation.form',
      'ai.citation.investigation',
      'ai.action.viewReport',
      'ai.action.openInvestigation',
      'ai.action.sendReminder',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M17 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'ai.title',
      'ai.capabilities',
      'ai.recentPrompts',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('M17 mock data', () => {
  it('has AI conversation with roles and citations', async () => {
    const { mockAiConversation } = await import('./lib/mock-data-tables');
    expect(mockAiConversation.length).toBeGreaterThan(0);
    for (const msg of mockAiConversation) {
      expect(['user', 'assistant']).toContain(msg.role);
    }
    const assistantMsgs = mockAiConversation.filter((m) => m.role === 'assistant');
    expect(assistantMsgs.some((m) => (m.citations?.length ?? 0) > 0)).toBe(true);
  });

  it('has AI capabilities', async () => {
    const { mockAiCapabilities } = await import('./lib/mock-data-tables');
    expect(mockAiCapabilities.length).toBe(4);
  });

  it('has recent prompts', async () => {
    const { mockRecentPrompts } = await import('./lib/mock-data-tables');
    expect(mockRecentPrompts.length).toBeGreaterThan(0);
  });
});

describe('M17 page files exist', () => {
  const root = path.resolve(__dirname, '..');

  it('has AI assistant page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'ai', 'page.tsx'))).toBe(true);
  });

  it('has sidebar with AI nav item', () => {
    const sidebar = fs.readFileSync(path.join(root, 'src', 'components', 'Sidebar.tsx'), 'utf-8');
    expect(sidebar).toContain('/ai');
    expect(sidebar).toContain('console.aiAssistant');
  });
});
