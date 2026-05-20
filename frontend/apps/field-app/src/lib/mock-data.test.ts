import { describe, it, expect } from 'vitest';
import { mockReports } from './mock-reports';
import { mockMessages, mockAlerts } from './mock-messages';

describe('mock reports', () => {
  it('has at least 4 reports', () => {
    expect(mockReports.length).toBeGreaterThanOrEqual(4);
  });

  it('covers all editable states (draft, returned)', () => {
    const states = new Set(mockReports.map((r) => r.state));
    expect(states.has('draft')).toBe(true);
    expect(states.has('returned')).toBe(true);
  });

  it('has unique ids', () => {
    const ids = mockReports.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('mock messages', () => {
  it('has messages', () => {
    expect(mockMessages.length).toBeGreaterThan(0);
  });

  it('has at least one unread message', () => {
    expect(mockMessages.some((m) => !m.read)).toBe(true);
  });
});

describe('mock alerts', () => {
  it('has alerts', () => {
    expect(mockAlerts.length).toBeGreaterThan(0);
  });

  it('covers reportReturned and reportApproved types', () => {
    expect(mockAlerts.some((a) => a.type === 'reportReturned')).toBe(true);
    expect(mockAlerts.some((a) => a.type === 'reportApproved')).toBe(true);
  });
});
