// Design Tokens — WDC Kaduna State Digital Reporting Platform
// Extracted from walkthrough PDFs (canonical source)

// ─── Colors ───
export const colors = {
  // Primary — Forest Green
  forestGreen: '#1A7A4A',
  forestGreenDark: '#135A37',
  forestGreenSoft: '#E6F2EC',

  // Accent — Amber
  amber: '#E8730A',
  amberSoft: '#FDEBD8',

  // Secondary — Aubergine
  aubergine: '#3D1A5C',
  aubergineDark: '#2A1140',
  aubergineSoft: '#EEE7F5',

  // Neutrals
  warmWhite: '#F9F7F4',
  warmWhite2: '#F3EFE9',
  charcoal: '#2B2B2B',
  charcoal2: '#555550',

  // Supporting
  sage: '#A8C5A0',
  sageMuted: '#8FA98B',
  softRed: '#C0392B',
  softRedSoft: '#F7E0DD',

  // Lines
  line: '#E8E3DB',
  lineStrong: '#D8D1C5',

  // Dark theme
  darkBg: '#17121D',
  darkSurface: '#1F1827',
  darkSurface2: '#2A2132',
  darkLine: '#362C40',
  darkText: '#F3EFE9',
  darkTextDim: '#A89EB5',
} as const;

// ─── Typography ───
export const typography = {
  display: 'Plus Jakarta Sans',
  ui: 'Inter',
  accent: 'Caveat',
} as const;

export const typeScale = {
  '11': 11,
  '12.5': 12.5,
  '15': 15,
  '18': 18,
  '22': 22,
  '28': 28,
  '42': 42,
} as const;

// ─── Spacing ───
export const spacing = {
  base: 4,
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
} as const;

// ─── Radius ───
export const radius = {
  phoneBezel: 44,
  phoneScreen: 34,
  card: 12,
  cardLarge: 16,
  chip: 100, // pill
} as const;

// ─── Touch Targets ───
export const tapTarget = {
  min: 44, // px, never less
} as const;

// ─── Hit States ───
export const hitState = {
  overlay: '10% tint',
  // Never shadow
} as const;

// ─── Status Colors ───
export const statusColors = {
  review: colors.amber,
  approved: colors.forestGreen,
  flagged: colors.softRed,
  missing: colors.charcoal2,
  queued: colors.aubergine,
  submitted: colors.forestGreen,
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
  tapTarget,
  hitState,
  statusColors,
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
