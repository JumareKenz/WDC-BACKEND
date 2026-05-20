import { describe, it, expect } from 'vitest';
import { mockFormVersion, getFieldLabel, getOptionLabel, type FormField } from './mock-forms';

describe('mock form version', () => {
  it('has a valid schema with fields', () => {
    expect(mockFormVersion.fields.length).toBeGreaterThan(0);
  });

  it('every field has English and Hausa labels', () => {
    for (const field of mockFormVersion.fields) {
      expect(field.label_en).toBeTruthy();
      expect(field.label_ha).toBeTruthy();
    }
  });

  it('covers all required field types', () => {
    const types = new Set(mockFormVersion.fields.map((f) => f.type));
    expect(types.has('text')).toBe(true);
    expect(types.has('number')).toBe(true);
    expect(types.has('date')).toBe(true);
    expect(types.has('select')).toBe(true);
    expect(types.has('photo')).toBe(true);
    expect(types.has('voice')).toBe(true);
  });

  it('select fields have options with dual-language labels', () => {
    const selectField = mockFormVersion.fields.find((f) => f.type === 'select');
    expect(selectField).toBeDefined();
    expect(selectField!.options!.length).toBeGreaterThan(0);
    for (const opt of selectField!.options!) {
      expect(opt.label_en).toBeTruthy();
      expect(opt.label_ha).toBeTruthy();
    }
  });
});

describe('getFieldLabel', () => {
  it('returns English label for en locale', () => {
    const field: FormField = {
      key: 'test',
      label_en: 'English',
      label_ha: 'Hausa',
      type: 'text',
      required: false,
    };
    expect(getFieldLabel(field, 'en')).toBe('English');
  });

  it('returns Hausa label for ha locale', () => {
    const field: FormField = {
      key: 'test',
      label_en: 'English',
      label_ha: 'Hausa',
      type: 'text',
      required: false,
    };
    expect(getFieldLabel(field, 'ha')).toBe('Hausa');
  });
});

describe('getOptionLabel', () => {
  it('returns correct locale label', () => {
    const opt = { value: 'x', label_en: 'Yes', label_ha: 'Eh' };
    expect(getOptionLabel(opt, 'en')).toBe('Yes');
    expect(getOptionLabel(opt, 'ha')).toBe('Eh');
  });
});
