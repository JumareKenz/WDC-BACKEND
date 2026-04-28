import { SetMetadata } from '@nestjs/common';
import type { Role } from '../rls/rls-context';

export const ROLES_KEY = 'wdc:roles';

/**
 * Restrict a handler to one or more roles. Defence-in-depth on top of RLS:
 * RLS filters rows; this decorator filters whole endpoints.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
