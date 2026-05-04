import type { Config } from 'tailwindcss';
import { colors, spacing, radius, typography } from '../tokens';

const tailwindColors: Record<string, Record<string, string>> = {};

// Flatten colors for Tailwind
Object.entries(colors).forEach(([key, value]) => {
  const parts = key.replace(/([A-Z])/g, '-$1').toLowerCase();
  tailwindColors[parts] = { DEFAULT: value };
});

// Add status colors
tailwindColors['status-review'] = { DEFAULT: colors.amber };
tailwindColors['status-approved'] = { DEFAULT: colors.forestGreen };
tailwindColors['status-flagged'] = { DEFAULT: colors.softRed };
tailwindColors['status-missing'] = { DEFAULT: colors.charcoal2 };
tailwindColors['status-queued'] = { DEFAULT: colors.aubergine };
tailwindColors['status-submitted'] = { DEFAULT: colors.forestGreen };

export const wdcPreset: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        display: [typography.display, 'sans-serif'],
        ui: [typography.ui, 'sans-serif'],
        accent: [typography.accent, 'cursive'],
      },
      spacing: {
        ...Object.fromEntries(
          Object.entries(spacing).map(([k, v]) => [k, `${v}px`])
        ),
      },
      borderRadius: {
        'phone-bezel': `${radius.phoneBezel}px`,
        'phone-screen': `${radius.phoneScreen}px`,
        'card': `${radius.card}px`,
        'card-lg': `${radius.cardLarge}px`,
        'chip': `${radius.chip}px`,
      },
    },
  },
  plugins: [],
};

export default wdcPreset;
