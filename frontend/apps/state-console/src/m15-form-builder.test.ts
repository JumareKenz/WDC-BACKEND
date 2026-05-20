import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('M15 i18n keys', () => {
  it('has all M15 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'forms.title',
      'forms.newForm',
      'forms.listEmpty',
      'forms.columns.title',
      'forms.columns.scope',
      'forms.columns.status',
      'forms.columns.version',
      'forms.columns.updatedAt',
      'forms.status.draft',
      'forms.status.deployed',
      'forms.status.archived',
      'forms.scope.state',
      'forms.scope.lga',
      'forms.scope.ward',
      'formBuilder.editor.title',
      'formBuilder.fields',
      'formBuilder.properties',
      'formBuilder.preview',
      'formBuilder.fieldLabel',
      'formBuilder.fieldLabelHa',
      'formBuilder.fieldType',
      'formBuilder.fieldRequired',
      'formBuilder.addField',
      'formBuilder.save',
      'formBuilder.deploy',
      'formBuilder.dragToReorder',
      'formBuilder.text',
      'formBuilder.number',
      'formBuilder.date',
      'formBuilder.select',
      'formBuilder.checkbox',
      'formBuilder.textarea',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M15 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'forms.title',
      'forms.newForm',
      'formBuilder.fieldLabelHa',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('M15 mock data', () => {
  it('has forms with valid statuses', async () => {
    const { mockForms } = await import('./lib/mock-data-tables');
    expect(mockForms.length).toBeGreaterThan(0);
    for (const f of mockForms) {
      expect(['draft', 'deployed', 'archived']).toContain(f.status);
      expect(['state', 'lga', 'ward']).toContain(f.scopeKind);
      expect(f.titleHa.length).toBeGreaterThan(0);
    }
  });

  it('has form fields with Hausa labels', async () => {
    const { mockFormFields } = await import('./lib/mock-data-tables');
    const allFields = Object.values(mockFormFields).flat();
    expect(allFields.length).toBeGreaterThan(0);
    for (const field of allFields) {
      expect(field.labelHa.length).toBeGreaterThan(0);
      expect(['text', 'number', 'date', 'select', 'checkbox', 'textarea']).toContain(field.type);
    }
  });
});

describe('M15 page files exist', () => {
  const root = path.resolve(__dirname, '..');

  it('has forms list page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'forms', 'page.tsx'))).toBe(true);
  });

  it('has form editor page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'forms', '[id]', 'page.tsx'))).toBe(true);
  });

  it('has new form page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'forms', 'new', 'page.tsx'))).toBe(true);
  });

  it('has FormEditor component', () => {
    expect(fs.existsSync(path.join(root, 'src', 'components', 'FormEditor.tsx'))).toBe(true);
  });
});
