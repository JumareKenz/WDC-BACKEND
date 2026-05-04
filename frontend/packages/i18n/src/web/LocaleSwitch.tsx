import React from 'react';
import { useLocale, localeLabels, supportedLocales, type Locale } from '../index';

interface LocaleSwitchProps {
  className?: string;
}

export const LocaleSwitch: React.FC<LocaleSwitchProps> = ({ className = '' }) => {
  const { locale, setLocale } = useLocale();

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    gap: 4,
    padding: 4,
    backgroundColor: '#f0ede8',
    borderRadius: 8,
  };

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: isActive ? '#fff' : 'transparent',
    color: isActive ? '#1A7A4A' : '#555550',
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 150ms ease',
    minHeight: 32,
  });

  return (
    <div className={className} style={containerStyle} role="group" aria-label="Language switcher">
      {supportedLocales.map((l: Locale) => (
        <button
          key={l}
          style={buttonStyle(l === locale)}
          onClick={() => setLocale(l)}
          aria-pressed={l === locale}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
};

export default LocaleSwitch;
