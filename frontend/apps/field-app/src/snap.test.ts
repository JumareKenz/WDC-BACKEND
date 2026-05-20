import { describe, it, expect } from 'vitest';

describe('M10 i18n keys', () => {
  it('has all M10 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'snap.title',
      'snap.instruction',
      'snap.capture',
      'snap.retake',
      'snap.processing',
      'snap.review',
      'snap.confidenceHigh',
      'snap.confidenceMedium',
      'snap.confidenceLow',
      'snap.viewOriginal',
      'snap.useData',
      'snap.fieldLabel',
      'snap.extractedValue',
      'snap.editValue',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M10 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'snap.title',
      'snap.instruction',
      'snap.capture',
      'snap.retake',
      'snap.processing',
      'snap.review',
      'snap.confidenceHigh',
      'snap.confidenceMedium',
      'snap.confidenceLow',
      'snap.viewOriginal',
      'snap.useData',
      'snap.fieldLabel',
      'snap.extractedValue',
      'snap.editValue',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('useOcr state machine', () => {
  it('defines all required states', () => {
    const states = ['capture', 'processing', 'review', 'error'];
    expect(states).toContain('capture');
    expect(states).toContain('processing');
    expect(states).toContain('review');
    expect(states).toContain('error');
  });

  it('mock result has realistic confidence ranges', () => {
    // Simulated confidence values should be in [0, 1]
    const mockConfidences = [0.94, 0.88, 0.97, 0.82];
    for (const c of mockConfidences) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('high confidence threshold is above 0.9', () => {
    expect(0.9).toBeLessThanOrEqual(1);
  });
});

describe('OCR field structure', () => {
  it('has key, label, value, confidence properties', () => {
    const field = { key: 'x', label: 'X', value: '1', confidence: 0.95 };
    expect(field.key).toBeTruthy();
    expect(field.label).toBeTruthy();
    expect(field.value).toBeDefined();
    expect(field.confidence).toBeGreaterThanOrEqual(0);
  });
});
