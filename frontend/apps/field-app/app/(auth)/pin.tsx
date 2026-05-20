import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing, radius } from '@wdc/design-system';

export default function PinScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!phone.trim() || !pin.trim()) return;
    setIsSubmitting(true);
    try {
      const deviceId = 'mobile-device-1';
      await signIn(phone.trim(), pin.trim(), deviceId);
      router.replace('/(app)');
    } catch {
      Alert.alert(t('common.error'), t('auth.invalidPin'));
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, pin, signIn, router, t]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>✓</Text>
        </View>
        <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.enterPin')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('auth.phone')}</Text>
          <TextInput
            style={styles.input}
            placeholder="+234 801 234 5678"
            placeholderTextColor={colors.neutral400}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!isSubmitting}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('auth.pin')}</Text>
          <TextInput
            style={styles.input}
            placeholder="• • • • • •"
            placeholderTextColor={colors.neutral400}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            editable={!isSubmitting}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!phone || !pin || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSignIn}
          disabled={!phone || !pin || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? t('common.loading') : t('auth.signIn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    padding: spacing['24'],
    paddingTop: spacing['48'],
    alignItems: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['20'],
  },
  logoText: { fontSize: 28, color: colors.primary600, fontWeight: '700' },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral900,
    marginBottom: spacing['6'],
  },
  subtitle: { fontSize: 15, color: colors.neutral500 },
  form: { padding: spacing['24'], gap: spacing['16'] },
  inputGroup: { gap: spacing['6'] },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.neutral700 },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius.lg,
    padding: spacing['14'],
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.neutral900,
  },
  footer: { padding: spacing['24'] },
  submitButton: {
    backgroundColor: colors.primary600,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
