import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/token.service';
import type { RlsContext } from './rls-context';

/**
 * Build the per-request RLS context from a verified JWT payload. Used by
 * services that wrap their DB work in `withRlsTransaction(ctx, ...)`.
 *
 * If the request is unauthenticated (e.g. a `@Public()` route hitting the DB
 * for some reason), services should use a system-role context explicitly —
 * never default to it from a missing user.
 */
export function rlsContextFromRequest(req: Request & { user?: JwtPayload }): RlsContext {
  const u = req.user;
  if (!u) {
    throw new Error('rlsContextFromRequest called on an unauthenticated request');
  }
  return {
    userId: u.sub,
    role: u.role,
    lgaId: u.lga,
    wardId: u.ward,
  };
}
