// Domain types and validation
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['secretary', 'coordinator', 'director']),
  phone: z.string(),
  email: z.string().email().optional(),
  lgaId: z.string().uuid().nullable(),
  wardId: z.string().uuid().nullable(),
  status: z.enum(['active', 'suspended']),
});

export const ReportStatusSchema = z.enum([
  'draft',
  'submitted',
  'in_review',
  'approved',
  'returned',
  'sealed',
]);

export const ReportSchema = z.object({
  id: z.string().uuid(),
  status: ReportStatusSchema,
  wardId: z.string().uuid(),
  formVersionId: z.string().uuid(),
  canonical: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// Report state machine transitions
export const reportTransitions: Record<ReportStatus, ReportStatus[]> = {
  draft: ['submitted'],
  submitted: ['in_review'],
  in_review: ['approved', 'returned'],
  approved: ['sealed'],
  returned: ['draft'],
  sealed: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return reportTransitions[from]?.includes(to) ?? false;
}