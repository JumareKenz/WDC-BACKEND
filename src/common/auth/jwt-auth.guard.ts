import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TokenService, type JwtPayload } from '../../modules/auth/token.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) throw new UnauthorizedException('missing bearer token');

    let payload: JwtPayload;
    try {
      const token = match[1] ?? '';
      payload = await this.tokens.verifyAccess(token);
    } catch {
      throw new UnauthorizedException('invalid or expired token');
    }
    req.user = payload;
    return true;
  }
}
