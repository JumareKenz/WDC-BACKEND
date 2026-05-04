import { describe, it, expect } from 'vitest';
import { tokens, getColor, getStatusColor } from '../src/tokens';

describe('tokens', () => {
  it('has all required colors', () => {
    expect(tokens.colors.forestGreen).toBe('#1A7A4A');
    expect(tokens.colors.forestGreenDark).toBe('#135A37');
    expect(tokens.colors.amber).toBe('#E8730A');
    expect(tokens.colors.aubergine).toBe('#3D1A5C');
  });

  it('has status colors', () => {
    expect(tokens.statusColors.approved).toBe('#1A7A4A');
    expect(tokens.statusColors.review).toBe('#E8730A');
    expect(tokens.statusColors.flagged).toBe('#C0392B');
  });

  it('getColor returns correct hex', () => {
    expect(getColor('forestGreen')).toBe('#1A7A4A');
    expect(getColor('warmWhite')).toBe('#F9F7F4');
  });

  it('getStatusColor returns correct hex', () => {
    expect(getStatusColor('approved')).toBe('#1A7A4A');
    expect(getStatusColor('review')).toBe('#E8730A');
  });
});
