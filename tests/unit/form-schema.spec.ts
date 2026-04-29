import { describe, it, expect } from 'vitest';
import { parseFormSchema } from '../../src/modules/forms/form-schema';

const minimal = {
  version: 1,
  sections: [
    {
      key: 'basics',
      label_en: 'Basics',
      label_ha: 'Bayani',
      fields: [
        { key: 'household_count', type: 'number', label_en: 'Households', label_ha: 'Iyalai', required: true, decimals: 0 },
      ],
    },
  ],
};

describe('parseFormSchema', () => {
  it('accepts a minimal valid schema', () => {
    expect(() => parseFormSchema(minimal)).not.toThrow();
  });

  it('rejects an unknown field type', () => {
    const bad = structuredClone(minimal);
    (bad.sections[0]!.fields[0] as Record<string, unknown>).type = 'voice-note';
    expect(() => parseFormSchema(bad)).toThrow();
  });

  it('rejects a missing label_ha (Hausa label is mandatory)', () => {
    const bad = structuredClone(minimal);
    delete (bad.sections[0]!.fields[0] as Record<string, unknown>).label_ha;
    expect(() => parseFormSchema(bad)).toThrow(/label_ha/);
  });

  it('rejects duplicate field keys within a section', () => {
    const bad = structuredClone(minimal);
    bad.sections[0]!.fields.push({ ...bad.sections[0]!.fields[0]! });
    expect(() => parseFormSchema(bad)).toThrow(/duplicate field key/);
  });

  it('rejects duplicate section keys', () => {
    const bad = { ...minimal, sections: [minimal.sections[0]!, minimal.sections[0]!] };
    expect(() => parseFormSchema(bad)).toThrow(/duplicate section key/);
  });

  it('accepts a select field with bilingual options', () => {
    const ok = structuredClone(minimal);
    ok.sections[0]!.fields.push({
      key: 'water_source',
      type: 'select',
      label_en: 'Primary water source',
      label_ha: 'Babban hanyar samun ruwa',
      required: false,
      multiple: false,
      options: [
        { value: 'borehole', label_en: 'Borehole', label_ha: 'Rijiya' },
        { value: 'river', label_en: 'River', label_ha: 'Kogi' },
      ],
    } as never);
    expect(() => parseFormSchema(ok)).not.toThrow();
  });

  it('rejects a non-snake_case field key', () => {
    const bad = structuredClone(minimal);
    bad.sections[0]!.fields[0]!.key = 'HouseholdCount';
    expect(() => parseFormSchema(bad)).toThrow();
  });
});
