import { describe, it, expect } from 'vitest';
import { tokens, getColor, getStatusColor } from '../src/tokens';

describe('tokens', () => {
  it('has all required colors', () => {
    expect(tokens.colors.forestGreen).toBe('#16a34a');
    expect(tokens.colors.forestGreenDark).toBe('#15803d');
    expect(tokens.colors.amber).toBe('#f59e0b');
    expect(tokens.colors.aubergine).toBe('#a855f7');
  });

  it('has status colors', () => {
    expect(tokens.statusColors.approved).toBe('#22c55e');
    expect(tokens.statusColors.in_review).toBe('#f59e0b');
    expect(tokens.statusColors.flagged).toBe('#ef4444');
  });

  it('getColor returns correct hex', () => {
    expect(getColor('forestGreen')).toBe('#16a34a');
    expect(getColor('warmWhite')).toBe('#fafafa');
  });

  it('getStatusColor returns correct hex', () => {
    expect(getStatusColor('approved')).toBe('#22c55e');
    expect(getStatusColor('in_review')).toBe('#f59e0b');
  });
});
