import { describe, it, expect } from 'vitest';
import {
  reportStateReducer,
  canTransition,
  nextState,
  expectedFromState,
  isEditable,
  rolesForTransition,
  ReportStateSchema,
  CreateReportRequestSchema,
  SetFieldRequestSchema,
  ReturnReportRequestSchema,
  UserSchema,
  ReportSchema,
} from './index';

// ─── Zod schema validation tests ───
describe('Zod schemas', () => {
  it('validates a complete User', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'secretary',
      fullName: 'Aisha Bello',
      phone: '+2348012345678',
      email: null,
      lgaId: null,
      wardId: null,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(UserSchema.parse(user)).toEqual(user);
  });

  it('rejects an invalid UUID in User', () => {
    const user = {
      id: 'not-a-uuid',
      role: 'secretary',
      fullName: 'Aisha Bello',
      phone: '+2348012345678',
      email: null,
      lgaId: null,
      wardId: null,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  it('validates a Report', () => {
    const report = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      formVersionId: '550e8400-e29b-41d4-a716-446655440001',
      wardId: '550e8400-e29b-41d4-a716-446655440002',
      submittedBy: '550e8400-e29b-41d4-a716-446655440003',
      submissionMethod: 'amira',
      state: 'draft',
      sealedAt: null,
      canonical: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(ReportSchema.parse(report)).toEqual(report);
  });

  it('rejects invalid report state', () => {
    const report = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      formVersionId: '550e8400-e29b-41d4-a716-446655440001',
      wardId: '550e8400-e29b-41d4-a716-446655440002',
      submittedBy: '550e8400-e29b-41d4-a716-446655440003',
      submissionMethod: 'amira',
      state: 'invalid',
      sealedAt: null,
      canonical: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(() => ReportSchema.parse(report)).toThrow();
  });

  it('validates CreateReportRequest', () => {
    const req = { formVersionId: '550e8400-e29b-41d4-a716-446655440000', submissionMethod: 'wizard' };
    expect(CreateReportRequestSchema.parse(req)).toEqual(req);
  });

  it('rejects invalid submissionMethod', () => {
    expect(() =>
      CreateReportRequestSchema.parse({
        formVersionId: '550e8400-e29b-41d4-a716-446655440000',
        submissionMethod: 'email',
      }),
    ).toThrow();
  });

  it('validates SetFieldRequest', () => {
    const req = { key: 'household_count', value: 42, source: 'typed' as const };
    expect(SetFieldRequestSchema.parse(req)).toEqual(req);
  });

  it('rejects invalid field key format', () => {
    expect(() => SetFieldRequestSchema.parse({ key: '123-invalid', value: 1, source: 'typed' })).toThrow();
  });

  it('validates ReturnReportRequest', () => {
    const req = { notes: 'Missing data' };
    expect(ReturnReportRequestSchema.parse(req)).toEqual(req);
  });

  it('rejects empty notes', () => {
    expect(() => ReturnReportRequestSchema.parse({ notes: '' })).toThrow();
  });
});

// ─── State machine tests ───
describe('reportStateReducer', () => {
  it('transitions draft → submitted', () => {
    expect(reportStateReducer('draft', { type: 'submit' })).toBe('submitted');
  });

  it('transitions submitted → in_review', () => {
    expect(reportStateReducer('submitted', { type: 'open_review' })).toBe('in_review');
  });

  it('transitions in_review → approved', () => {
    expect(reportStateReducer('in_review', { type: 'approve' })).toBe('approved');
  });

  it('transitions in_review → returned', () => {
    expect(reportStateReducer('in_review', { type: 'return' })).toBe('returned');
  });

  it('transitions returned → draft', () => {
    expect(reportStateReducer('returned', { type: 'edit_returned' })).toBe('draft');
  });

  it('transitions approved → sealed', () => {
    expect(reportStateReducer('approved', { type: 'seal' })).toBe('sealed');
  });

  it('allows field_set in draft', () => {
    expect(
      reportStateReducer('draft', {
        type: 'field_set',
        payload: { key: 'x', value: 1, source: 'typed' },
      }),
    ).toBe('draft');
  });

  it('allows field_set in returned', () => {
    expect(
      reportStateReducer('returned', {
        type: 'field_set',
        payload: { key: 'x', value: 1, source: 'typed' },
      }),
    ).toBe('returned');
  });

  it('throws on field_set in submitted', () => {
    expect(() =>
      reportStateReducer('submitted', {
        type: 'field_set',
        payload: { key: 'x', value: 1, source: 'typed' },
      }),
    ).toThrow('Cannot edit fields in state submitted');
  });

  it('throws on invalid transition draft → approve', () => {
    expect(() => reportStateReducer('draft', { type: 'approve' })).toThrow(
      'Invalid transition approve from state draft',
    );
  });

  it('throws on invalid transition sealed → anything', () => {
    expect(() => reportStateReducer('sealed', { type: 'submit' })).toThrow(
      'Invalid transition submit from state sealed',
    );
  });

  it('reset action sets arbitrary state', () => {
    expect(reportStateReducer('sealed', { type: 'reset', state: 'draft' })).toBe('draft');
  });
});

describe('canTransition', () => {
  it('returns true for valid transitions', () => {
    expect(canTransition('draft', 'submit')).toBe(true);
    expect(canTransition('submitted', 'open_review')).toBe(true);
    expect(canTransition('in_review', 'approve')).toBe(true);
    expect(canTransition('in_review', 'return')).toBe(true);
    expect(canTransition('returned', 'edit_returned')).toBe(true);
    expect(canTransition('approved', 'seal')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(canTransition('draft', 'approve')).toBe(false);
    expect(canTransition('submitted', 'submit')).toBe(false);
    expect(canTransition('approved', 'return')).toBe(false);
    expect(canTransition('sealed', 'submit')).toBe(false);
  });
});

describe('isEditable', () => {
  it('returns true for draft and returned', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('returned')).toBe(true);
  });

  it('returns false for other states', () => {
    expect(isEditable('submitted')).toBe(false);
    expect(isEditable('in_review')).toBe(false);
    expect(isEditable('approved')).toBe(false);
    expect(isEditable('sealed')).toBe(false);
  });
});

describe('rolesForTransition', () => {
  it('secretary/director can submit and edit_returned', () => {
    expect(rolesForTransition('submit')).toContain('secretary');
    expect(rolesForTransition('submit')).toContain('director');
    expect(rolesForTransition('edit_returned')).toContain('secretary');
  });

  it('coordinator/director can open_review, approve, return', () => {
    expect(rolesForTransition('open_review')).toContain('coordinator');
    expect(rolesForTransition('approve')).toContain('coordinator');
    expect(rolesForTransition('return')).toContain('coordinator');
  });

  it('only system can seal', () => {
    expect(rolesForTransition('seal')).toEqual(['system']);
  });
});

describe('ReportStateSchema', () => {
  it('accepts all valid states', () => {
    const states = ['draft', 'submitted', 'in_review', 'approved', 'returned', 'sealed'] as const;
    for (const s of states) {
      expect(ReportStateSchema.parse(s)).toBe(s);
    }
  });

  it('rejects invalid state', () => {
    expect(() => ReportStateSchema.parse('deleted')).toThrow();
  });
});

describe('nextState + expectedFromState pairs', () => {
  const cases: Array<{ transition: Parameters<typeof nextState>[0]; from: string; to: string }> = [
    { transition: 'submit', from: 'draft', to: 'submitted' },
    { transition: 'open_review', from: 'submitted', to: 'in_review' },
    { transition: 'approve', from: 'in_review', to: 'approved' },
    { transition: 'return', from: 'in_review', to: 'returned' },
    { transition: 'edit_returned', from: 'returned', to: 'draft' },
    { transition: 'seal', from: 'approved', to: 'sealed' },
  ];

  it.each(cases)('transition $transition goes from $from to $to', ({ transition, from, to }) => {
    expect(expectedFromState(transition)).toBe(from);
    expect(nextState(transition)).toBe(to);
  });
});
