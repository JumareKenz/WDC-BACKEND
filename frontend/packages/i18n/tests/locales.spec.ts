import { describe, it, expect } from 'vitest';
import { enMessages } from '../src/locales/en';
import { haMessages } from '../src/locales/ha';
import { supportedLocales, defaultLocale, localeLabels } from '../src/types';

describe('i18n locale bundles', () => {
  it('has matching keys in en and ha', () => {
    const enKeys = Object.keys(enMessages).sort();
    const haKeys = Object.keys(haMessages).sort();
    expect(enKeys).toEqual(haKeys);
  });

  it('has no empty strings in en', () => {
    Object.entries(enMessages).forEach(([key, value]) => {
      expect(value, `Key ${key} is empty`).toBeTruthy();
    });
  });

  it('has no empty strings in ha', () => {
    Object.entries(haMessages).forEach(([key, value]) => {
      expect(value, `Key ${key} is empty`).toBeTruthy();
    });
  });

  it('supports exactly en and ha', () => {
    expect(supportedLocales).toEqual(['en', 'ha']);
  });

  it('default locale is en', () => {
    expect(defaultLocale).toBe('en');
  });

  it('locale labels are defined', () => {
    expect(localeLabels.en).toBe('English');
    expect(localeLabels.ha).toBe('Hausa');
  });
});

describe('i18n message interpolation', () => {
  it('interpolates count in sync.pending', () => {
    const msg = enMessages['sync.pending'];
    const count = 3;
    const result = msg.replace('{count}', String(count));
    expect(result).toBe('3 reports pending');
  });

  it('interpolates time in sync.lastSync', () => {
    const msg = enMessages['sync.lastSync'];
    const time = '14:30';
    const result = msg.replace('{time}', time);
    expect(result).toBe('Last synced: 14:30');
  });
});
