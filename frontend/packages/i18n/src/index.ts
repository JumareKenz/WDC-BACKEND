// i18n - English + Hausa translations
import { createIntl, createIntlCache } from 'react-intl';

export type Locale = 'en' | 'ha';

const messages = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
    },
    auth: {
      signIn: 'Sign In',
      signOut: 'Sign Out',
      pin: 'PIN',
      phone: 'Phone Number',
      password: 'Password',
    },
    nav: {
      dashboard: 'Dashboard',
      reports: 'Reports',
      messages: 'Messages',
      settings: 'Settings',
    },
  },
  ha: {
    common: {
      loading: 'Loading...',
      error: 'Kuskure ya faru',
      retry: 'Gwada',
      cancel: 'Soke',
      save: 'Ajiye',
      delete: 'Goge',
      edit: 'Shirya',
      close: 'Rufe',
    },
    auth: {
      signIn: 'Shiga',
      signOut: 'Fita',
      pin: 'PIN',
      phone: 'Lambar tarho',
      password: 'Kalmar sirri',
    },
    nav: {
      dashboard: 'Dashboard',
      reports: 'Rahotanni',
      messages: 'Sakoonai',
      settings: 'Saiti',
    },
  },
};

const cache = createIntlCache();

export const intl = createIntl(
  {
    locale: 'en',
    messages: messages.en,
  },
  cache
);

export function useLocale(): Locale {
  // TODO: Get from context/persistence
  return 'en';
}

export function setLocale(locale: Locale) {
  // TODO: Persist and update intl
  console.log('Locale set to:', locale);
}

export function t(key: string, values?: Record<string, unknown>): string {
  return intl.formatMessage({ id: key, defaultMessage: key }, values);
}