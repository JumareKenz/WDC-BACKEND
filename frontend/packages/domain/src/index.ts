// Domain types and validation — M5
import { z } from 'zod';

// ─── Shared ───
export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().datetime();

// ─── Users ───
export const UserRoleSchema = z.enum(['secretary', 'coordinator', 'director', 'system']);
export const UserStatusSchema = z.enum(['active', 'suspended', 'deleted']);

export const UserSchema = z.object({
  id: UuidSchema,
  role: UserRoleSchema,
  fullName: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  lgaId: UuidSchema.nullable(),
  wardId: UuidSchema.nullable(),
  status: UserStatusSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const CreateUserRequestSchema = z.object({
  role: z.enum(['secretary', 'coordinator', 'director']),
  fullName: z.string().min(1).max(200),
  phone: z.string(),
  email: z.string().email().optional(),
  lgaId: UuidSchema.optional(),
  wardId: UuidSchema.optional(),
});

// ─── Forms ───
export const FormScopeKindSchema = z.enum(['state', 'lga', 'ward']);
export const FormStatusSchema = z.enum(['draft', 'deployed', 'archived']);

export const FormSchema = z.object({
  id: UuidSchema,
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1).max(200),
  titleHa: z.string().min(1).max(200),
  scopeKind: FormScopeKindSchema,
  scopeIds: z.array(UuidSchema),
  status: FormStatusSchema,
  currentVersionId: UuidSchema.nullable(),
  createdBy: UuidSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const FormVersionSchema = z.object({
  id: UuidSchema,
  formId: UuidSchema,
  versionNumber: z.number().int().min(1),
  schema: z.record(z.unknown()),
  deployedAt: IsoDateSchema.nullable(),
  deployedBy: UuidSchema.nullable(),
  createdAt: IsoDateSchema,
});

// ─── Reports ───
export const ReportStateSchema = z.enum([
  'draft',
  'submitted',
  'in_review',
  'approved',
  'returned',
  'sealed',
]);

export const SubmissionMethodSchema = z.enum(['amira', 'wizard', 'snap']);

export const ReportSchema = z.object({
  id: UuidSchema,
  formVersionId: UuidSchema,
  wardId: UuidSchema,
  submittedBy: UuidSchema,
  submissionMethod: SubmissionMethodSchema,
  state: ReportStateSchema,
  sealedAt: IsoDateSchema.nullable(),
  canonical: z.record(z.unknown()),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const CreateReportRequestSchema = z.object({
  formVersionId: UuidSchema,
  submissionMethod: SubmissionMethodSchema,
  wardId: UuidSchema.optional(),
});

export const SetFieldRequestSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
  value: z.unknown(),
  source: z.enum(['typed', 'voiced', 'scanned']),
  confidence: z.number().min(0).max(1).nullable().optional(),
  opId: UuidSchema.optional(),
  wallClockTs: IsoDateSchema.optional(),
});

export const ReturnReportRequestSchema = z.object({
  notes: z.string().min(1).max(2000),
});

// ─── Messages ───
export const BroadcastMessageRequestSchema = z.object({
  body: z.string().min(1).max(4000),
  channels: z.array(z.enum(['in_app', 'email', 'sms', 'whatsapp'])).min(1),
  scopeKind: FormScopeKindSchema,
  scopeIds: z.array(UuidSchema).optional(),
  urgent: z.boolean().optional(),
});

// ─── Telemetry ───
export const TelemetryLogRequestSchema = z.object({
  level: z.enum(['error', 'warn', 'debug', 'info']),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Type exports ───
export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export type Form = z.infer<typeof FormSchema>;
export type FormScopeKind = z.infer<typeof FormScopeKindSchema>;
export type FormStatus = z.infer<typeof FormStatusSchema>;
export type FormVersion = z.infer<typeof FormVersionSchema>;

export type Report = z.infer<typeof ReportSchema>;
export type ReportState = z.infer<typeof ReportStateSchema>;
export type SubmissionMethod = z.infer<typeof SubmissionMethodSchema>;
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
export type SetFieldRequest = z.infer<typeof SetFieldRequestSchema>;
export type ReturnReportRequest = z.infer<typeof ReturnReportRequestSchema>;

export type BroadcastMessageRequest = z.infer<typeof BroadcastMessageRequestSchema>;
export type TelemetryLogRequest = z.infer<typeof TelemetryLogRequestSchema>;

// ─── Report state machine ───
// Mirrors backend report-projection.ts exactly
export type Transition =
  | 'submit'
  | 'open_review'
  | 'approve'
  | 'return'
  | 'edit_returned'
  | 'seal';

interface TransitionDef {
  from: ReportState;
  to: ReportState;
}

const TRANSITIONS: Record<Transition, TransitionDef> = {
  submit: { from: 'draft', to: 'submitted' },
  open_review: { from: 'submitted', to: 'in_review' },
  approve: { from: 'in_review', to: 'approved' },
  return: { from: 'in_review', to: 'returned' },
  edit_returned: { from: 'returned', to: 'draft' },
  seal: { from: 'approved', to: 'sealed' },
};

export function nextState(transition: Transition): ReportState {
  return TRANSITIONS[transition].to;
}

export function expectedFromState(transition: Transition): ReportState {
  return TRANSITIONS[transition].from;
}

export function canTransition(from: ReportState, transition: Transition): boolean {
  return TRANSITIONS[transition].from === from;
}

export function isEditable(state: ReportState): boolean {
  return state === 'draft' || state === 'returned';
}

/** Roles permitted to drive a given transition. */
export function rolesForTransition(
  transition: Transition,
): ReadonlyArray<'secretary' | 'coordinator' | 'director' | 'system'> {
  switch (transition) {
    case 'submit':
    case 'edit_returned':
      return ['secretary', 'director'];
    case 'open_review':
    case 'approve':
    case 'return':
      return ['coordinator', 'director'];
    case 'seal':
      return ['system'];
  }
}

/** State-machine reducer action. */
export type ReportAction =
  | { type: Transition }
  | { type: 'field_set'; payload: { key: string; value: unknown; source: string; confidence?: number | null } }
  | { type: 'reset'; state: ReportState };

/** Pure reducer for report state. Invalid transitions throw. */
export function reportStateReducer(state: ReportState, action: ReportAction): ReportState {
  if (action.type === 'reset') return action.state;
  if (action.type === 'field_set') {
    if (!isEditable(state)) {
      throw new Error(`Cannot edit fields in state ${state}`);
    }
    return state;
  }
  const transition = action.type as Transition;
  if (!canTransition(state, transition)) {
    throw new Error(
      `Invalid transition ${transition} from state ${state} (expected ${expectedFromState(transition)})`,
    );
  }
  return nextState(transition);
}
