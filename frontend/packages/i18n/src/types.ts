export type Locale = 'en' | 'ha';

export const supportedLocales: Locale[] = ['en', 'ha'];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ha: 'Hausa',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ha: 'ltr',
};
