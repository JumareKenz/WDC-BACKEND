import { describe, it, expect, vi } from 'vitest';
import { RequestIdMiddleware, REQUEST_ID_HEADER } from '../../src/common/logger/request-id.middleware';
import type { Request, Response } from 'express';

function makeReqRes(headerValue?: string): {
  req: Request;
  res: Response;
  setHeader: ReturnType<typeof vi.fn>;
} {
  const setHeader = vi.fn();
  const headers: Record<string, string> = {};
  if (headerValue !== undefined) headers[REQUEST_ID_HEADER.toLowerCase()] = headerValue;
  const req = { headers } as unknown as Request;
  const res = { setHeader } as unknown as Response;
  return { req, res, setHeader };
}

describe('RequestIdMiddleware', () => {
  const mw = new RequestIdMiddleware();

  it('passes through a valid incoming UUID request id', () => {
    const incoming = '0190f4e7-83a8-7a1c-9b23-7c4e2d1a9f88';
    const { req, res, setHeader } = makeReqRes(incoming);
    const next = vi.fn();
    mw.use(req, res, next);
    expect((req as Request & { requestId: string }).requestId).toBe(incoming);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, incoming);
    expect(next).toHaveBeenCalledOnce();
  });

  it('generates a new UUID when no header is present', () => {
    const { req, res, setHeader } = makeReqRes(undefined);
    mw.use(req, res, vi.fn());
    const id = (req as Request & { requestId: string }).requestId;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });

  it('rejects a malformed incoming id and generates a fresh one instead', () => {
    const { req, res, setHeader } = makeReqRes('not-a-uuid');
    mw.use(req, res, vi.fn());
    const id = (req as Request & { requestId: string }).requestId;
    expect(id).not.toBe('not-a-uuid');
    expect(id).toMatch(/^[0-9a-f]{8}-/i);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });
});
