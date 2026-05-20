// M5: API Client — lightweight fetch-based client for WDC Backend
export * from './types';

import type {
  TokenResponse,
  SignInMobileRequest,
  SignInConsoleRequest,
  RefreshRequest,
  SignOutRequest,
  SignOutResponse,
  SetCredentialsRequest,
  User,
  UsersListParams,
  UsersListResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateAssignmentRequest,
  Form,
  FormVersion,
  CreateFormRequest,
  UpdateFormRequest,
  CreateFormVersionRequest,
  Report,
  CreateReportRequest,
  SetFieldRequest,
  ReturnReportRequest,
  ReportOp,
  BroadcastMessageRequest,
  BroadcastResponse,
  ListDeliveriesResponse,
  AskAiRequest,
  AiResponse,
  TelemetryLogRequest,
  TelemetryLogResponse,
  AuditAnchor,
  CreateAnchorResponse,
  HealthLiveResponse,
} from './types';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => string | undefined;
  onTokenRefreshed?: (token: TokenResponse) => void;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
  }
}

export { ApiError };

function buildUrl(base: string, path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export function createApiClient(config: ApiClientConfig) {
  async function fetchJson<T>(
    path: string,
    opts: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {},
  ): Promise<T> {
    const { params, ...rest } = opts;
    const url = buildUrl(config.baseUrl, path, params);
    const headers = new Headers(rest.headers);
    headers.set('accept', 'application/json');
    headers.set('content-type', 'application/json');
    const token = config.getAccessToken();
    if (token) headers.set('authorization', `Bearer ${token}`);

    const res = await fetch(url, { ...rest, headers });
    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      throw new ApiError(res.status, body, `HTTP ${res.status}`);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  return {
    auth: {
      signInMobile: (body: SignInMobileRequest) =>
        fetchJson<TokenResponse>('/api/v1/auth/sign-in/mobile', { method: 'POST', body: JSON.stringify(body) }),
      signInConsole: (body: SignInConsoleRequest) =>
        fetchJson<TokenResponse>('/api/v1/auth/sign-in/console', { method: 'POST', body: JSON.stringify(body) }),
      setCredentials: (body: SetCredentialsRequest) =>
        fetchJson<TokenResponse>('/api/v1/auth/set-credentials', { method: 'POST', body: JSON.stringify(body) }),
      refresh: (body: RefreshRequest) =>
        fetchJson<TokenResponse>('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify(body) }),
      signOut: (body: SignOutRequest) =>
        fetchJson<SignOutResponse>('/api/v1/auth/sign-out', { method: 'POST', body: JSON.stringify(body) }),
    },
    users: {
      list: (params?: UsersListParams) =>
        fetchJson<UsersListResponse>('/api/v1/users', { params: params as Record<string, string | undefined> }),
      get: (id: string) =>
        fetchJson<User>(`/api/v1/users/${id}`),
      create: (body: CreateUserRequest) =>
        fetchJson<CreateUserResponse>('/api/v1/users', { method: 'POST', body: JSON.stringify(body) }),
      delete: (id: string) =>
        fetchJson<void>(`/api/v1/users/${id}`, { method: 'DELETE' }),
      updateAssignment: (id: string, body: UpdateAssignmentRequest) =>
        fetchJson<User>(`/api/v1/users/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(body) }),
      suspend: (id: string) =>
        fetchJson<User>(`/api/v1/users/${id}/suspend`, { method: 'POST' }),
      reactivate: (id: string) =>
        fetchJson<User>(`/api/v1/users/${id}/reactivate`, { method: 'POST' }),
    },
    forms: {
      list: () => fetchJson<Form[]>('/api/v1/forms'),
      visible: () => fetchJson<Form[]>('/api/v1/forms/visible'),
      get: (id: string) => fetchJson<Form>(`/api/v1/forms/${id}`),
      create: (body: CreateFormRequest) =>
        fetchJson<Form>('/api/v1/forms', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: UpdateFormRequest) =>
        fetchJson<Form>(`/api/v1/forms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      deploy: (id: string) =>
        fetchJson<Form>(`/api/v1/forms/${id}/deploy`, { method: 'POST' }),
      archive: (id: string) =>
        fetchJson<Form>(`/api/v1/forms/${id}/archive`, { method: 'POST' }),
      listVersions: (id: string) =>
        fetchJson<FormVersion[]>(`/api/v1/forms/${id}/versions`),
      createVersion: (id: string, body: CreateFormVersionRequest) =>
        fetchJson<FormVersion>(`/api/v1/forms/${id}/versions`, { method: 'POST', body: JSON.stringify(body) }),
      getVersion: (id: string, n: number) =>
        fetchJson<FormVersion>(`/api/v1/forms/${id}/versions/${n}`),
    },
    reports: {
      list: (params?: { state?: string }) =>
        fetchJson<Report[]>('/api/v1/reports', { params }),
      get: (id: string) =>
        fetchJson<Report>(`/api/v1/reports/${id}`),
      create: (body: CreateReportRequest) =>
        fetchJson<Report>('/api/v1/reports', { method: 'POST', body: JSON.stringify(body) }),
      submit: (id: string) =>
        fetchJson<Report>(`/api/v1/reports/${id}/submit`, { method: 'POST' }),
      openReview: (id: string) =>
        fetchJson<Report>(`/api/v1/reports/${id}/open-review`, { method: 'POST' }),
      approve: (id: string) =>
        fetchJson<Report>(`/api/v1/reports/${id}/approve`, { method: 'POST' }),
      returnReport: (id: string, body: ReturnReportRequest) =>
        fetchJson<Report>(`/api/v1/reports/${id}/return`, { method: 'POST', body: JSON.stringify(body) }),
      editReturned: (id: string) =>
        fetchJson<Report>(`/api/v1/reports/${id}/edit-returned`, { method: 'POST' }),
      ops: (id: string) =>
        fetchJson<ReportOp[]>(`/api/v1/reports/${id}/ops`),
      setField: (id: string, body: SetFieldRequest) =>
        fetchJson<Report>(`/api/v1/reports/${id}/fields`, { method: 'POST', body: JSON.stringify(body) }),
    },
    messages: {
      broadcast: (body: BroadcastMessageRequest) =>
        fetchJson<BroadcastResponse>('/messages/broadcast', { method: 'POST', body: JSON.stringify(body) }),
      listDeliveries: (params?: { cursor?: string; limit?: string }) =>
        fetchJson<ListDeliveriesResponse>('/messages/deliveries', { params }),
    },
    ai: {
      ask: (body: AskAiRequest) =>
        fetchJson<AiResponse>('/ai/ask', { method: 'POST', body: JSON.stringify(body) }),
    },
    telemetry: {
      log: (body: TelemetryLogRequest) =>
        fetchJson<TelemetryLogResponse>('/api/v1/telemetry', { method: 'POST', body: JSON.stringify(body) }),
    },
    audit: {
      createAnchor: () =>
        fetchJson<CreateAnchorResponse>('/api/v1/audit/anchor', { method: 'POST' }),
      listAnchors: (params?: { limit?: string }) =>
        fetchJson<AuditAnchor[]>('/api/v1/audit/anchors', { params }),
      export: () =>
        fetch('/api/v1/audit/export', {
          headers: { authorization: `Bearer ${config.getAccessToken() ?? ''}` },
        }).then((r) => {
          if (!r.ok) throw new ApiError(r.status, null, `HTTP ${r.status}`);
          return r.text();
        }),
    },
    health: {
      live: () => fetchJson<HealthLiveResponse>('/health/live'),
      ready: () => fetch('/health/ready').then((r) => r.ok),
    },
  };
}

export type WdcApiClient = ReturnType<typeof createApiClient>;
