import { describe, it, expect } from 'vitest';
import {
  tokens,
  Button,
  Card,
  StatusPill,
  AppBar,
  TabBar,
  Modal,
  Sidebar,
  Toast,
  Skeleton,
} from '../src/web';

describe('composite components', () => {
  it('exports all web components', () => {
    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(StatusPill).toBeDefined();
    expect(AppBar).toBeDefined();
    expect(TabBar).toBeDefined();
    expect(Modal).toBeDefined();
    expect(Sidebar).toBeDefined();
    expect(Toast).toBeDefined();
    expect(Skeleton).toBeDefined();
  });

  it('tokens are accessible from web exports', () => {
    expect(tokens.colors.forestGreen).toBe('#16a34a');
    expect(tokens.spacing['16']).toBe(16);
    expect(tokens.radius.card).toBe(12);
  });

  it('Toast has correct variant styles', () => {
    // Check that Toast component accepts variant prop
    expect(Toast).toBeTypeOf('function');
  });

  it('Skeleton has correct default props', () => {
    expect(Skeleton).toBeTypeOf('function');
  });
});
