// Design Tokens — WDC Kaduna State Digital Reporting Platform
// Matches MVP UI_SPEC.md exactly

// ─── Colors ───
export const colors = {
  // Primary — Green (Nigeria/Kaduna themed)
  primary50: '#f0fdf4',
  primary100: '#dcfce7',
  primary200: '#bbf7d0',
  primary300: '#86efac',
  primary400: '#4ade80',
  primary500: '#22c55e',
  primary600: '#16a34a',
  primary700: '#15803d',
  primary800: '#166534',
  primary900: '#14532d',

  // Neutral
  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral200: '#e5e5e5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Accent
  aiPurple: '#a855f7',
  danger: '#dc2626',
  warningAlert: '#eab308',
  emerald: '#10b981',
  teal: '#14b8a6',

  // Status backgrounds
  successBg: '#dcfce7',
  warningBg: '#fef3c7',
  errorBg: '#fee2e2',
  infoBg: '#dbeafe',

  // Status text
  successText: '#166534',
  warningText: '#92400e',
  errorText: '#991b1b',
  infoText: '#1e40af',

  // Misc
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Dark theme neutrals (inverted)
  darkNeutral50: '#0a0a0a',
  darkNeutral100: '#171717',
  darkNeutral200: '#262626',
  darkNeutral300: '#404040',
  darkNeutral400: '#525252',
  darkNeutral500: '#737373',
  darkNeutral600: '#a3a3a3',
  darkNeutral700: '#d4d4d4',
  darkNeutral800: '#e5e5e5',
  darkNeutral900: '#fafafa',

  // Legacy aliases (keep imports working during migration)
  forestGreen: '#16a34a',
  forestGreenDark: '#15803d',
  forestGreenSoft: '#dcfce7',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  aubergine: '#a855f7',
  aubergineDark: '#7c3aed',
  aubergineSoft: '#f3e8ff',
  warmWhite: '#fafafa',
  warmWhite2: '#f5f5f5',
  charcoal: '#171717',
  charcoal2: '#525252',
  sage: '#86efac',
  sageMuted: '#4ade80',
  softRed: '#ef4444',
  softRedSoft: '#fee2e2',
  line: '#e5e5e5',
  lineStrong: '#d4d4d4',
  darkBg: '#0a0a0a',
  darkSurface: '#171717',
  darkSurface2: '#262626',
  darkLine: '#404040',
  darkText: '#fafafa',
  darkTextDim: '#a3a3a3',
} as const;

// ─── Typography ───
export const typography = {
  fontFamily: 'System',
  // Legacy aliases for web components
  display: 'System',
  ui: 'System',
  accent: 'System',
  h1: { fontSize: 30, fontWeight: '600' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '500' as const },
  badge: { fontSize: 12, fontWeight: '500' as const },
} as const;

export const typeScale = {
  '12': 12,
  '14': 14,
  '16': 16,
  '18': 18,
  '20': 20,
  '24': 24,
  '30': 30,
  '36': 36,
} as const;

// ─── Spacing ───
export const spacing = {
  base: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  // Numeric aliases for backwards compat
  '4': 4,
  '6': 6,
  '8': 8,
  '10': 10,
  '12': 12,
  '14': 14,
  '16': 16,
  '20': 20,
  '24': 24,
  '32': 32,
  '48': 48,
} as const;

// ─── Border Radius ───
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  // Legacy
  phoneBezel: 44,
  phoneScreen: 34,
  card: 12,
  cardLarge: 16,
  chip: 9999,
} as const;

// ─── Shadows (React Native compatible) ───
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
} as const;

// ─── Touch Targets ───
export const tapTarget = {
  min: 44,
} as const;

// ─── Status Colors ───
export const statusColors = {
  draft: colors.warning,
  submitted: colors.info,
  in_review: colors.warning,
  reviewed: colors.success,
  approved: colors.success,
  flagged: colors.error,
  returned: colors.error,
  declined: colors.error,
  sealed: colors.neutral500,
  missing: colors.neutral500,
  queued: colors.aiPurple,
} as const;

export const statusBgColors = {
  draft: colors.warningBg,
  submitted: colors.infoBg,
  in_review: colors.warningBg,
  reviewed: colors.successBg,
  approved: colors.successBg,
  flagged: colors.errorBg,
  returned: colors.errorBg,
  declined: colors.errorBg,
  sealed: colors.neutral100,
  missing: colors.neutral100,
  queued: colors.aubergineSoft,
} as const;

export const statusTextColors = {
  draft: colors.warningText,
  submitted: colors.infoText,
  in_review: colors.warningText,
  reviewed: colors.successText,
  approved: colors.successText,
  flagged: colors.errorText,
  returned: colors.errorText,
  declined: colors.errorText,
  sealed: colors.neutral600,
  missing: colors.neutral600,
  queued: colors.aubergineDark,
} as const;

// ─── Theme Types ───
export type ColorKey = keyof typeof colors;
export type StatusKey = keyof typeof statusColors;

// ─── Full Token Export ───
export const tokens = {
  colors,
  typography,
  typeScale,
  spacing,
  radius,
  shadows,
  tapTarget,
  statusColors,
  statusBgColors,
  statusTextColors,
} as const;

export type Tokens = typeof tokens;

// ─── Helper: get color by key ───
export function getColor(key: ColorKey): string {
  return colors[key];
}

// ─── Helper: get status color ───
export function getStatusColor(key: StatusKey): string {
  return statusColors[key];
}

export function getStatusBgColor(key: string): string {
  return statusBgColors[key as keyof typeof statusBgColors] ?? colors.neutral100;
}

export function getStatusTextColor(key: string): string {
  return statusTextColors[key as keyof typeof statusTextColors] ?? colors.neutral600;
}
