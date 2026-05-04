// Design System - tokens and primitives
// To be implemented in M2

export const tokens = {
  colors: {},
  typography: {},
  spacing: {},
  radius: {},
} as const;

export type Tokens = typeof tokens;

export const theme = {
  tokens,
  color: (name: string) => tokens.colors[name as keyof typeof tokens.colors],
} as const;

export type Theme = typeof theme;