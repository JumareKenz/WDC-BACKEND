import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('M19 release candidate', () => {
  it('has version bumped to 1.0.0-rc.1 in root package.json', () => {
    const root = path.resolve(__dirname, '../../..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('1.0.0-rc.1');
  });

  it('has version bumped in all workspace packages', () => {
    const root = path.resolve(__dirname, '../../..');
    const packages = [
      'packages/api-client/package.json',
      'packages/design-system/package.json',
      'packages/domain/package.json',
      'packages/i18n/package.json',
      'apps/field-app/package.json',
      'apps/state-console/package.json',
    ];
    for (const p of packages) {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));
      expect(pkg.version).toBe('1.0.0-rc.1');
    }
  });

  it('has CHANGELOG.md', () => {
    const root = path.resolve(__dirname, '../../..');
    expect(fs.existsSync(path.join(root, 'CHANGELOG.md'))).toBe(true);
  });

  it('has Playwright config', () => {
    const root = path.resolve(__dirname, '..');
    expect(fs.existsSync(path.join(root, 'playwright.config.ts'))).toBe(true);
  });

  it('has Playwright smoke tests for all routes', () => {
    const root = path.resolve(__dirname, '..');
    const smoke = fs.readFileSync(path.join(root, 'e2e', 'smoke.spec.ts'), 'utf-8');
    const routes = ['/', '/submissions', '/investigations', '/users', '/forms', '/messages', '/audit', '/analytics', '/ai', '/settings', '/lga/lga-1'];
    for (const route of routes) {
      expect(smoke).toContain(route);
    }
  });

  it('has e2e test script in package.json', () => {
    const root = path.resolve(__dirname, '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.scripts['test:e2e']).toContain('playwright');
  });
});
