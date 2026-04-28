import { Injectable, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

/**
 * Argon2id-backed PIN and password hashing.
 *
 * PIN flow (mobile, secretary/coordinator): hash = argon2id(pin || pepper)
 * with a per-user salt baked into the encoded hash. Pepper is per-deployment
 * and held in secrets manager — never in the DB.
 *
 * Password flow (console, director): same algorithm; same pepper. Distinct
 * from PIN only at the policy layer (length / complexity), not the algorithm.
 *
 * Parameters chosen per OWASP 2023 (Argon2id m=64MiB, t=3, p=1).
 */
@Injectable()
export class ArgonService {
  private readonly pepper: string;

  constructor(@Inject(ConfigService) config: ConfigService<AppConfig, true>) {
    this.pepper = config.get('auth', { infer: true }).argon2Pepper;
  }

  async hash(secret: string): Promise<string> {
    return argon2.hash(secret + this.pepper, {
      type: argon2.argon2id,
      memoryCost: 1 << 16, // 64 MiB
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verify(encoded: string, secret: string): Promise<boolean> {
    try {
      return await argon2.verify(encoded, secret + this.pepper);
    } catch {
      // Malformed encoded string — treat as a verification failure rather
      // than leaking parser internals to callers.
      return false;
    }
  }
}
