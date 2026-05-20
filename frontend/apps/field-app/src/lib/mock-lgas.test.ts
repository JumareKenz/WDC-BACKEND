import { describe, it, expect } from 'vitest';

describe('mock LGA data', () => {
  it('has 10 LGAs', async () => {
    const { mockLgas } = await import('./mock-lgas');
    expect(mockLgas.length).toBe(10);
  });

  it('has wards for every LGA', async () => {
    const { mockLgas, mockWards } = await import('./mock-lgas');
    for (const lga of mockLgas) {
      const wards = mockWards[lga.id];
      expect(wards).toBeDefined();
      expect(wards!.length).toBeGreaterThan(0);
    }
  });
});
