import { describe, it, expect } from 'vitest';
import { createApiClient, ApiError } from './index';

describe('createApiClient', () => {
  it('creates a client with all namespaces', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:3100', getAccessToken: () => 'token' });
    expect(client.auth).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.forms).toBeDefined();
    expect(client.reports).toBeDefined();
    expect(client.messages).toBeDefined();
    expect(client.ai).toBeDefined();
    expect(client.telemetry).toBeDefined();
    expect(client.audit).toBeDefined();
    expect(client.health).toBeDefined();
  });
});

describe('ApiError', () => {
  it('stores status and body', () => {
    const err = new ApiError(401, { message: 'Unauthorized' }, 'HTTP 401');
    expect(err.status).toBe(401);
    expect(err.body).toEqual({ message: 'Unauthorized' });
    expect(err.message).toBe('HTTP 401');
  });
});
