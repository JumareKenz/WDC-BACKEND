import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocale, localeLabels, supportedLocales, type Locale } from '../index';

interface LocaleSwitchProps {
  style?: object;
}

export const LocaleSwitch: React.FC<LocaleSwitchProps> = ({ style }) => {
  const { locale, setLocale } = useLocale();

  return (
    <View style={[styles.container, style]} accessibilityRole="radiogroup" accessibilityLabel="Language switcher">
      {supportedLocales.map((l: Locale) => {
        const isActive = l === locale;
        return (
          <TouchableOpacity
            key={l}
            style={[styles.button, isActive && styles.activeButton]}
            onPress={() => setLocale(l)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {localeLabels[l]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#f0ede8',
    borderRadius: 8,
    gap: 4,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#555550',
    fontFamily: 'Inter',
  },
  activeLabel: {
    fontWeight: '600',
    color: '#1A7A4A',
  },
});

export default LocaleSwitch;
