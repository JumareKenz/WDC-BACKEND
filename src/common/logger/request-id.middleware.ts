import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()];
    const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
    const id = typeof candidate === 'string' && UUID_RE.test(candidate) ? candidate : randomUUID();
    (req as Request & { requestId: string }).requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
