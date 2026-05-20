import type { Config } from 'tailwindcss';
import { wdcPreset } from '@wdc/design-system/web/tailwind-preset';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/design-system/src/web/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [wdcPreset],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
