import { describe, it, expect } from 'vitest';

describe('M7 i18n keys', () => {
  it('has all required M7 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'dashboard.quickActions',
      'dashboard.newReport',
      'reportsList.title',
      'reportDetail.title',
      'messages.title',
      'alerts.title',
      'settings.title',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all required M7 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'dashboard.quickActions',
      'dashboard.newReport',
      'reportsList.title',
      'reportDetail.title',
      'messages.title',
      'alerts.title',
      'settings.title',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});
