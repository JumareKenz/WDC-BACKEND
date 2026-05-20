import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { useLocale } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import {
  mockFormVersion,
  getFieldLabel,
  getFieldPlaceholder,
  getOptionLabel,
  type FormField,
} from '../../src/lib/mock-forms';
import { loadDraft, saveDraft, clearDraft } from '../../src/hooks/useDraftAutosave';
import { addToQueue, getPendingCount } from '../../src/hooks/useOfflineQueue';
import { useAuth } from '../../src/contexts/AuthContext';

function isFieldValid(field: FormField, value: unknown): boolean {
  if (field.required && (value === undefined || value === '' || value === null)) {
    return false;
  }
  if (field.type === 'number' && value !== undefined && value !== '') {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (field.min !== undefined && num < field.min) return false;
    if (field.max !== undefined && num > field.max) return false;
  }
  return true;
}

function AutoFilledIndicator() {
  const t = useFormatMessage();
  return (
    <View style={styles.autoFillBadge}>
      <Text style={styles.autoFillBadgeText}>{t('snap.autoFilled')}</Text>
    </View>
  );
}

export default function WizardScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const { locale } = useLocale();
  const { user } = useAuth();
  const formVersion = mockFormVersion;

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [autoFilledKeys, setAutoFilledKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const fields = formVersion.fields;
  const currentField = fields[step];
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadDraft(formVersion.id).then((draft) => {
      if (draft) {
        setValues(draft.values);
      }
    });
    getPendingCount().then(setPendingCount);
  }, [formVersion.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft(formVersion.id, values).then(() => {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      });
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values, formVersion.id]);

  const setValue = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }, []);

  // Used when OCR/voice returns auto-filled values
  const _setAutoFilledValues = useCallback(
    (fieldValues: Record<string, string>) => {
      setValues((prev) => ({ ...prev, ...fieldValues }));
      setAutoFilledKeys((prev) => {
        const next = new Set(prev);
        for (const key of Object.keys(fieldValues)) {
          next.add(key);
        }
        return next;
      });
    },
    []
  );
  void _setAutoFilledValues;

  const validateCurrent = useCallback((): boolean => {
    if (!currentField) return true;
    const valid = isFieldValid(currentField, values[currentField.key]);
    if (!valid) {
      setErrors((prev) => ({ ...prev, [currentField.key]: true }));
    }
    return valid;
  }, [currentField, values]);

  const handleNext = useCallback(() => {
    if (!validateCurrent()) return;
    if (step < fields.length - 1) {
      setStep((s) => s + 1);
    }
  }, [validateCurrent, step, fields.length]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  const handleSubmit = useCallback(async () => {
    const newErrors: Record<string, boolean> = {};
    let allValid = true;
    for (const field of fields) {
      const valid = isFieldValid(field, values[field.key]);
      if (!valid) {
        newErrors[field.key] = true;
        allValid = false;
      }
    }
    setErrors(newErrors);
    if (!allValid) {
      Alert.alert(t('common.error'), t('wizard.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const reportId = `rpt-${Date.now()}`;
      await addToQueue({
        id: `queue-${Date.now()}`,
        reportId,
        formVersionId: formVersion.id,
        wardId: user?.wardId ?? 'ward-1-1',
        values,
        submittedAt: new Date().toISOString(),
      });
      await clearDraft(formVersion.id);
      const count = await getPendingCount();
      setPendingCount(count);
      Alert.alert(t('toast.submitted'), t('sync.pending', { count: String(count) }), [
        { text: t('common.ok'), onPress: () => router.replace('/(app)') },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('toast.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [fields, values, t, user, formVersion.id, router]);

  const renderField = (field: FormField) => {
    const label = getFieldLabel(field, locale as 'en' | 'ha');
    const placeholder = getFieldPlaceholder(field, locale as 'en' | 'ha');
    const value = values[field.key];
    const hasError = errors[field.key];
    const isAutoFilled = autoFilledKeys.has(field.key);

    switch (field.type) {
      case 'text':
        return (
          <View style={styles.fieldWrapper}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                {label}
                {field.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              {isAutoFilled && <AutoFilledIndicator />}
            </View>
            <TextInput
              style={[
                styles.textInput,
                hasError && styles.inputError,
                isAutoFilled && styles.inputAutoFilled,
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors.neutral400}
              value={value !== undefined ? String(value) : ''}
              onChangeText={(text) => setValue(field.key, text)}
              multiline={field.key === 'summary'}
              numberOfLines={field.key === 'summary' ? 4 : 1}
            />
            {hasError && <Text style={styles.errorText}>{t('wizard.required')}</Text>}
          </View>
        );

      case 'number':
        return (
          <View style={styles.fieldWrapper}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                {label}
                {field.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              {isAutoFilled && <AutoFilledIndicator />}
            </View>
            <TextInput
              style={[
                styles.textInput,
                hasError && styles.inputError,
                isAutoFilled && styles.inputAutoFilled,
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors.neutral400}
              value={value !== undefined ? String(value) : ''}
              onChangeText={(text) => setValue(field.key, text)}
              keyboardType="numeric"
            />
            {hasError && (
              <Text style={styles.errorText}>
                {field.min !== undefined || field.max !== undefined
                  ? `${t('wizard.invalid')} (${field.min ?? 0}-${field.max ?? '∞'})`
                  : t('wizard.required')}
              </Text>
            )}
          </View>
        );

      case 'date':
        return (
          <View style={styles.fieldWrapper}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                {label}
                {field.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              {isAutoFilled && <AutoFilledIndicator />}
            </View>
            <TextInput
              style={[
                styles.textInput,
                hasError && styles.inputError,
                isAutoFilled && styles.inputAutoFilled,
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.neutral400}
              value={value !== undefined ? String(value) : ''}
              onChangeText={(text) => setValue(field.key, text)}
            />
            {hasError && <Text style={styles.errorText}>{t('wizard.required')}</Text>}
          </View>
        );

      case 'select':
        return (
          <View style={styles.fieldWrapper}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                {label}
                {field.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              {isAutoFilled && <AutoFilledIndicator />}
            </View>
            <View style={styles.optionsWrapper}>
              {field.options?.map((opt) => {
                const selected = value === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() => setValue(field.key, opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selected && styles.optionChipTextSelected,
                      ]}
                    >
                      {getOptionLabel(opt, locale as 'en' | 'ha')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {hasError && <Text style={styles.errorText}>{t('wizard.required')}</Text>}
          </View>
        );

      case 'photo':
        return (
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>
              {label}
              {field.required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() =>
                router.push({
                  pathname: '/(app)/snap',
                  params: { returnKey: field.key },
                })
              }
            >
              <Text style={styles.mediaButtonIcon}>📷</Text>
              <Text style={styles.mediaButtonText}>{t('forms.photo')}</Text>
              <Text style={styles.mediaButtonHint}>
                {value ? '✓ ' + t('snap.captured') : t('snap.instruction')}
              </Text>
            </TouchableOpacity>
            {hasError && <Text style={styles.errorText}>{t('wizard.required')}</Text>}
          </View>
        );

      case 'voice':
        return (
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>
              {label}
              {field.required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() =>
                router.push({
                  pathname: '/(app)/amira',
                  params: { returnKey: field.key },
                })
              }
            >
              <Text style={styles.mediaButtonIcon}>🎙</Text>
              <Text style={styles.mediaButtonText}>{t('forms.voice')}</Text>
              <Text style={styles.mediaButtonHint}>
                {value
                  ? String(value).substring(0, 40) + '...'
                  : t('amira.instruction')}
              </Text>
            </TouchableOpacity>
            {hasError && <Text style={styles.errorText}>{t('wizard.required')}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← {t('wizard.back')}</Text>
          </TouchableOpacity>
          {draftSaved && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>✓ {t('wizard.draftSaved')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{t('wizard.title')}</Text>
        <Text style={styles.stepText}>
          {t('wizard.step', {
            current: String(step + 1),
            total: String(fields.length),
          })}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / fields.length) * 100}%` },
          ]}
        />
      </View>

      {/* OCR + Voice shortcuts */}
      <View style={styles.aiActions}>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push({ pathname: '/(app)/snap', params: { returnKey: '__ocr_autofill__' } })}
        >
          <Text style={styles.aiButtonIcon}>📷</Text>
          <Text style={styles.aiButtonText}>{t('snap.ocrFill')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push({ pathname: '/(app)/amira', params: { returnKey: '__voice_autofill__' } })}
        >
          <Text style={styles.aiButtonIcon}>🎙</Text>
          <Text style={styles.aiButtonText}>{t('amira.voiceFill')}</Text>
        </TouchableOpacity>
      </View>

      {/* Field */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {currentField && renderField(currentField)}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>
            {t('offline.pending', { count: String(pendingCount) })}
          </Text>
        )}
        {step < fields.length - 1 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>{t('wizard.next')} →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('wizard.submit')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    padding: spacing['16'],
    paddingTop: spacing['24'],
    paddingBottom: spacing['12'],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  backButton: { paddingVertical: spacing['4'] },
  backText: { fontSize: 14, color: colors.primary600, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '600', color: colors.neutral900 },
  stepText: { fontSize: 14, color: colors.neutral500, marginTop: spacing['4'] },
  draftBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing['10'],
    paddingVertical: spacing['4'],
    borderRadius: radius.full,
  },
  draftBadgeText: { fontSize: 12, color: colors.successText, fontWeight: '500' },
  progressBar: {
    height: 3,
    backgroundColor: colors.neutral200,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary500,
  },
  aiActions: {
    flexDirection: 'row',
    gap: spacing['8'],
    paddingHorizontal: spacing['16'],
    paddingVertical: spacing['10'],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
    paddingVertical: spacing['10'],
    paddingHorizontal: spacing['12'],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary200,
    gap: spacing['6'],
  },
  aiButtonIcon: { fontSize: 16 },
  aiButtonText: { fontSize: 13, color: colors.primary700, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing['16'], paddingBottom: spacing['32'] },
  fieldWrapper: { marginBottom: spacing['20'] },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral900,
  },
  requiredStar: { color: colors.error },
  autoFillBadge: {
    backgroundColor: colors.aubergineSoft,
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  autoFillBadgeText: {
    fontSize: 11,
    color: colors.aiPurple,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius.lg,
    padding: spacing['12'],
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.neutral900,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.error, backgroundColor: colors.errorBg },
  inputAutoFilled: {
    borderColor: colors.aiPurple,
    backgroundColor: colors.aubergineSoft,
  },
  errorText: { fontSize: 13, color: colors.error, marginTop: spacing['6'] },
  optionsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['8'] },
  optionChip: {
    paddingHorizontal: spacing['14'],
    paddingVertical: spacing['10'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.neutral300,
    backgroundColor: colors.white,
  },
  optionChipSelected: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  optionChipText: { fontSize: 14, color: colors.neutral700 },
  optionChipTextSelected: { color: colors.white, fontWeight: '600' },
  mediaButton: {
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing['20'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  mediaButtonIcon: { fontSize: 24, marginBottom: spacing['6'] },
  mediaButtonText: { fontSize: 14, fontWeight: '500', color: colors.neutral700 },
  mediaButtonHint: { fontSize: 12, color: colors.neutral500, marginTop: spacing['4'] },
  footer: {
    padding: spacing['16'],
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    backgroundColor: colors.white,
  },
  pendingText: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing['8'],
  },
  primaryButton: {
    backgroundColor: colors.primary600,
    borderRadius: radius.lg,
    padding: spacing['14'],
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
