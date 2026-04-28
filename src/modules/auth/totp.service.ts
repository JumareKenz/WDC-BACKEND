import { Injectable, Inject } from '@nestjs/common';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

/**
 * TOTP (RFC 6238) for director 2FA. Window of ±1 step (= ±30s) tolerates
 * clock skew but bounds replay risk to a single previous step.
 *
 * Secret storage: the raw base32 secret is encrypted at rest with pgcrypto
 * (in users.totp_secret_ciphertext, keyed by users.key_id). This service
 * only handles the secret in memory; persistence is the caller's job.
 */
@Injectable()
export class TotpService {
  private readonly issuer: string;

  constructor(@Inject(ConfigService) config: ConfigService<AppConfig, true>) {
    this.issuer = config.get('auth', { infer: true }).totpIssuer;
    authenticator.options = { window: 1, digits: 6, step: 30 };
  }

  /** Generate a fresh base32 secret for a new TOTP enrollment. */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** otpauth URI suitable for rendering as a QR code. */
  enrolmentUri(account: string, secret: string): string {
    return authenticator.keyuri(account, this.issuer, secret);
  }

  verify(secret: string, token: string): boolean {
    if (!/^\d{6}$/.test(token)) return false;
    try {
      return authenticator.check(token, secret);
    } catch {
      return false;
    }
  }
}
