import { describe, it, expect } from 'vitest';
import {
  expectedFromState,
  isEditable,
  nextState,
  projectCanonical,
  rolesForTransition,
  type ReportOp,
} from '../../src/modules/reports/report-projection';

function fieldSet(opId: string, ts: string, key: string, value: unknown): ReportOp {
  return {
    opId,
    opKind: 'field_set',
    payload: { key, value, source: 'typed', confidence: null },
    wallClockTs: ts,
  };
}

describe('projectCanonical', () => {
  it('handles an empty op log', () => {
    expect(projectCanonical([])).toEqual({ fields: {}, attachments: [], notes: [] });
  });

  it('most recent wall_clock_ts wins for the same field', () => {
    const ops: ReportOp[] = [
      fieldSet('00000001-0000-0000-0000-000000000000', '2026-04-29T10:00:00.000Z', 'k', 1),
      fieldSet('00000002-0000-0000-0000-000000000000', '2026-04-29T10:00:01.000Z', 'k', 2),
    ];
    expect(projectCanonical(ops).fields.k?.value).toBe(2);
  });

  it('larger op_id breaks a wall_clock tie', () => {
    const ops: ReportOp[] = [
      fieldSet('aaaaaaaa-0000-0000-0000-000000000000', '2026-04-29T10:00:00.000Z', 'k', 'a'),
      fieldSet('bbbbbbbb-0000-0000-0000-000000000000', '2026-04-29T10:00:00.000Z', 'k', 'b'),
    ];
    expect(projectCanonical(ops).fields.k?.value).toBe('b');
  });

  it('different fields are independent', () => {
    const ops: ReportOp[] = [
      fieldSet('11111111-0000-0000-0000-000000000000', '2026-04-29T10:00:00.000Z', 'a', 1),
      fieldSet('22222222-0000-0000-0000-000000000000', '2026-04-29T10:00:01.000Z', 'b', 2),
    ];
    const out = projectCanonical(ops);
    expect(out.fields.a?.value).toBe(1);
    expect(out.fields.b?.value).toBe(2);
  });

  it('attachment_add deduplicates and preserves first-seen order', () => {
    const ops: ReportOp[] = [
      {
        opId: '00000001-0000-0000-0000-000000000000',
        opKind: 'attachment_add',
        payload: { attachment_id: 'a1', kind: 'image' },
        wallClockTs: '2026-04-29T10:00:00.000Z',
      },
      {
        opId: '00000002-0000-0000-0000-000000000000',
        opKind: 'attachment_add',
        payload: { attachment_id: 'a1', kind: 'image' },
        wallClockTs: '2026-04-29T10:00:01.000Z',
      },
      {
        opId: '00000003-0000-0000-0000-000000000000',
        opKind: 'attachment_add',
        payload: { attachment_id: 'a2', kind: 'audio' },
        wallClockTs: '2026-04-29T10:00:02.000Z',
      },
    ];
    expect(projectCanonical(ops).attachments).toEqual(['a1', 'a2']);
  });

  it('return notes are appended in chronological order', () => {
    const ops: ReportOp[] = [
      {
        opId: '00000001-0000-0000-0000-000000000000',
        opKind: 'return',
        payload: { notes: 'first' },
        wallClockTs: '2026-04-29T10:00:00.000Z',
      },
      {
        opId: '00000002-0000-0000-0000-000000000000',
        opKind: 'return',
        payload: { notes: 'second' },
        wallClockTs: '2026-04-29T10:00:01.000Z',
      },
    ];
    expect(projectCanonical(ops).notes).toEqual(['first', 'second']);
  });
});

describe('state machine', () => {
  it('transitions describe expected from-state', () => {
    expect(expectedFromState('submit')).toBe('draft');
    expect(expectedFromState('approve')).toBe('in_review');
    expect(expectedFromState('seal')).toBe('approved');
  });

  it('isEditable allows draft and returned only', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('returned')).toBe(true);
    expect(isEditable('submitted')).toBe(false);
    expect(isEditable('in_review')).toBe(false);
    expect(isEditable('approved')).toBe(false);
    expect(isEditable('sealed')).toBe(false);
  });

  it('rolesForTransition: only system can seal', () => {
    expect(rolesForTransition('seal')).toEqual(['system']);
    expect(rolesForTransition('submit')).toContain('secretary');
    expect(rolesForTransition('approve')).toContain('coordinator');
  });

  it('nextState yields the to-state', () => {
    expect(nextState('submit')).toBe('submitted');
    expect(nextState('approve')).toBe('approved');
    expect(nextState('return')).toBe('returned');
    expect(nextState('seal')).toBe('sealed');
  });
});
