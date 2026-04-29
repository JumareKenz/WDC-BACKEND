import { createHash } from 'node:crypto';

const E164_RE = /^\+[1-9]\d{9,14}$/;

/**
 * Normalise a phone number to E.164. Accepts strings already in E.164 form;
 * also accepts a Nigerian national format (e.g. `08012345678` -> `+2348012345678`)
 * because that's what users actually type. Rejects anything else.
 */
export function normalisePhone(input: string): string {
  const trimmed = input.replace(/[\s\-()]/g, '');
  if (E164_RE.test(trimmed)) return trimmed;
  // Nigerian local format: leading 0 + 10 digits → +234 + 10 digits.
  if (/^0\d{10}$/.test(trimmed)) return `+234${trimmed.slice(1)}`;
  throw new Error(`phone is not in E.164 or Nigerian national form: ${input}`);
}

export function sha256Buf(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

export function phoneHash(phoneE164: string): Buffer {
  return sha256Buf(phoneE164);
}

export function emailHash(email: string): Buffer {
  return sha256Buf(email.trim().toLowerCase());
}
