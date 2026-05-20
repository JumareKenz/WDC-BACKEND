import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import type { Locale } from './types';
import { supportedLocales, defaultLocale, localeLabels, localeDirections } from './types';
import { enMessages } from './locales/en';
import { haMessages } from './locales/ha';

const messagesByLocale: Record<Locale, Record<string, string>> = {
  en: enMessages,
  ha: haMessages,
};

// ─── Context ───
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: 'ltr' | 'rtl';
  label: string;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}

// ─── Provider ───
interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({
  children,
  initialLocale = defaultLocale,
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    if (supportedLocales.includes(next)) {
      setLocaleState(next);
      // Persist to localStorage / AsyncStorage in real apps
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem?.('wdc-locale', next);
      }
    }
  }, []);

  const toggleLocale = useCallback(() => {
    const currentIndex = supportedLocales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % supportedLocales.length;
    setLocale(supportedLocales[nextIndex]!);
  }, [locale, setLocale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      direction: localeDirections[locale],
      label: localeLabels[locale],
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale]
  );

  const messages = messagesByLocale[locale] ?? messagesByLocale[defaultLocale];

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        messages={messages}
        defaultLocale={defaultLocale}
        onError={(err) => {
          // Suppress missing-message warnings in test/dev
          if (err.code === 'MISSING_TRANSLATION') return;
          console.warn('react-intl error:', err);
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
};

// ─── Utility hook for formatted messages ───
export function useFormatMessage(): (id: string, values?: Record<string, string | number>) => string {
  const { locale } = useLocale();
  const messages = messagesByLocale[locale] ?? messagesByLocale[defaultLocale];

  return useCallback(
    (id: string, values?: Record<string, string | number>) => {
      let msg = messages[id] ?? messagesByLocale[defaultLocale][id] ?? id;
      if (values) {
        Object.entries(values).forEach(([key, val]) => {
          msg = msg.replace(new RegExp(`{${key}}`, 'g'), String(val));
        });
      }
      return msg;
    },
    [messages]
  );
}

// ─── Re-exports ───
export { supportedLocales, defaultLocale, localeLabels, localeDirections };
export type { Locale };
export { enMessages, haMessages };
