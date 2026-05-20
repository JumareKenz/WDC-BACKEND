// Generated from backend openapi.yaml
// M5: API Client types for WDC Backend

// ─── Auth ───
export interface SignInMobileRequest {
  phone: string;
  pin: string;
  deviceId: string;
}

export interface SignInConsoleRequest {
  email: string;
  password: string;
  totp: string;
  deviceId: string;
}

export interface TokenResponse {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface SetCredentialsRequest {
  enrolmentToken: string;
  pin?: string;
  password?: string;
  totpSecret?: string;
  totp?: string;
}

export interface RefreshRequest {
  refreshToken: string;
  deviceId: string;
}

export interface SignOutRequest {
  deviceId: string;
}

export interface SignOutResponse {
  revoked: number;
}

// ─── Users ───
export type UserRole = 'secretary' | 'coordinator' | 'director' | 'system';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string | null;
  lgaId: string | null;
  wardId: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  role: 'secretary' | 'coordinator' | 'director';
  fullName: string;
  phone: string;
  email?: string;
  lgaId?: string;
  wardId?: string;
}

export interface CreateUserResponse extends User {
  enrolmentToken: string;
  enrolmentExpiresAt: string;
}

export interface UpdateAssignmentRequest {
  lgaId: string | null;
  wardId: string | null;
}

export interface UsersListParams {
  role?: UserRole;
  lgaId?: string;
  wardId?: string;
  cursor?: string;
  limit?: string;
}

export interface UsersListResponse {
  items: User[];
  nextCursor: string | null;
}

// ─── Forms ───
export type FormScopeKind = 'state' | 'lga' | 'ward';
export type FormStatus = 'draft' | 'deployed' | 'archived';

export interface Form {
  id: string;
  slug: string;
  title: string;
  titleHa: string;
  scopeKind: FormScopeKind;
  scopeIds: string[];
  status: FormStatus;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormRequest {
  slug: string;
  title: string;
  titleHa: string;
  scopeKind: FormScopeKind;
  scopeIds?: string[];
}

export interface UpdateFormRequest {
  title?: string;
  titleHa?: string;
  scopeKind?: FormScopeKind;
  scopeIds?: string[];
}

export interface FormVersion {
  id: string;
  formId: string;
  versionNumber: number;
  schema: Record<string, unknown>;
  deployedAt: string | null;
  deployedBy: string | null;
  createdAt: string;
}

export interface CreateFormVersionRequest {
  schema: Record<string, unknown>;
}

// ─── Reports ───
export type ReportState = 'draft' | 'submitted' | 'in_review' | 'approved' | 'returned' | 'sealed';
export type SubmissionMethod = 'amira' | 'wizard' | 'snap';

export interface Report {
  id: string;
  formVersionId: string;
  wardId: string;
  submittedBy: string;
  submissionMethod: SubmissionMethod;
  state: ReportState;
  sealedAt: string | null;
  canonical: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  formVersionId: string;
  submissionMethod: SubmissionMethod;
  wardId?: string;
}

export interface SetFieldRequest {
  key: string;
  value: unknown;
  source: 'typed' | 'voiced' | 'scanned';
  confidence?: number | null;
  opId?: string;
  wallClockTs?: string;
}

export interface ReturnReportRequest {
  notes: string;
}

export interface ReportOp {
  opId: string;
  opKind: string;
  actorUserId: string;
  deviceId: string;
  wallClockTs: string;
  serverSeq: string;
  payload: Record<string, unknown>;
}

// ─── Messages ───
export type MessageChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export interface BroadcastMessageRequest {
  body: string;
  channels: MessageChannel[];
  scopeKind: FormScopeKind;
  scopeIds?: string[];
  urgent?: boolean;
}

export interface BroadcastResponse {
  messageId: string;
  conversationId: string;
  recipientCount: number;
  deliveryCount: number;
  queuedDuringQuietHours: boolean;
}

export interface DeliveryAttempt {
  id: string;
  channel: string;
  status: string;
  providerRef: string | null;
  payload: Record<string, unknown>;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

export interface ListDeliveriesResponse {
  items: DeliveryAttempt[];
  nextCursor: string | null;
}

// ─── AI ───
export interface AskAiRequest {
  question: string;
}

export interface AiSource {
  type: 'structured' | 'semantic';
  queryId?: string;
  embeddingId?: string;
  snippet: string;
}

export interface AiResponse {
  answer: string;
  sources: AiSource[];
  cached?: boolean;
}

// ─── Telemetry ───
export interface TelemetryLogRequest {
  level: 'error' | 'warn' | 'debug' | 'info';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryLogResponse {
  ok: boolean;
}

// ─── Audit ───
export interface AuditAnchor {
  id: string;
  anchoredAt: string;
  latestEventId: string;
  latestHash: string;
  signatureAlg: string;
  signingKeyId: string;
  signature: string;
  verified: boolean;
}

export interface CreateAnchorResponse {
  created: boolean;
  id?: string;
  latestEventId?: string;
  latestHash?: string;
}

// ─── Health ───
export interface HealthLiveResponse {
  status: 'ok';
  uptime: number;
}

// ─── API Error ───
export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}
