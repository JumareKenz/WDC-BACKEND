/**
 * Generate an RS256 keypair for JWT signing.
 *
 * Writes ./secrets/jwt-private.pem and ./secrets/jwt-public.pem.
 * The secrets/ directory is git-ignored.
 *
 * Production deploys must NOT use these. Production keys live in Vault /
 * AWS Secrets Manager and are rotated quarterly per RUNBOOK §4.
 *
 * Usage: pnpm gen:jwt-keys
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'secrets');
mkdirSync(dir, { recursive: true });

const privPath = resolve(dir, 'jwt-private.pem');
const pubPath = resolve(dir, 'jwt-public.pem');

if (existsSync(privPath) || existsSync(pubPath)) {
  if (process.env.FORCE !== '1') {
    process.stderr.write(
      `refusing to overwrite ${privPath} or ${pubPath}.\nSet FORCE=1 to regenerate (this invalidates every issued token).\n`,
    );
    process.exit(1);
  }
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(privPath, privateKey, { mode: 0o600 });
writeFileSync(pubPath, publicKey, { mode: 0o644 });

process.stdout.write(`wrote ${privPath} (mode 600)\nwrote ${pubPath} (mode 644)\n`);
