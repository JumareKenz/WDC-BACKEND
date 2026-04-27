/**
 * Validates the committed `openapi.yaml`:
 *   - is parseable YAML
 *   - declares openapi >= 3.0
 *   - has a non-empty `paths` block
 *
 * Breaking-change diffing against a baseline is added in M5 once the surface
 * stabilises (oasdiff in CI). For M1 we only assert the spec is well-formed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

function fail(msg: string): never {
  process.stderr.write(`openapi:check FAILED — ${msg}\n`);
  process.exit(1);
}

const path = resolve(process.cwd(), 'openapi.yaml');
if (!existsSync(path)) fail(`missing openapi.yaml at ${path}`);

let doc: unknown;
try {
  doc = parse(readFileSync(path, 'utf8'));
} catch (err) {
  fail(`unparseable YAML: ${(err as Error).message}`);
}

if (typeof doc !== 'object' || doc === null) fail('openapi.yaml root must be an object');

const root = doc as Record<string, unknown>;
const version = String(root.openapi ?? '');
if (!/^3\.\d+/.test(version)) fail(`openapi version must be 3.x, got "${version}"`);

const paths = root.paths;
if (typeof paths !== 'object' || paths === null) fail('missing/invalid `paths`');
if (Object.keys(paths as Record<string, unknown>).length === 0) {
  fail('`paths` must declare at least one route');
}

process.stdout.write(`openapi:check ok — version=${version}, ${Object.keys(paths as Record<string, unknown>).length} path(s)\n`);
