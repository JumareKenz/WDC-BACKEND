import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockReports } from '../../src/lib/mock-reports';
import { reportStateReducer, isEditable } from '@wdc/domain';
import { useState } from 'react';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useFormatMessage();
  const report = mockReports.find((r) => r.id === id);
  const [localState, setLocalState] = useState(report?.state ?? 'draft');

  if (!report) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      </View>
    );
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: colors.warningBg, text: colors.warningText },
    submitted: { bg: colors.infoBg, text: colors.infoText },
    in_review: { bg: colors.warningBg, text: colors.warningText },
    approved: { bg: colors.successBg, text: colors.successText },
    returned: { bg: colors.errorBg, text: colors.errorText },
    sealed: { bg: colors.neutral100, text: colors.neutral600 },
  };

  const stateStyle = statusColors[localState] || { bg: colors.neutral100, text: colors.neutral600 };

  const handleSubmit = () => {
    Alert.alert(t('common.confirm'), t('reportDetail.confirmSubmit'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.submit'),
        style: 'default',
        onPress: () => {
          try {
            const next = reportStateReducer(localState, { type: 'submit' });
            setLocalState(next);
          } catch (e) {
            Alert.alert(t('common.error'), String(e));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('reportDetail.title')}</Text>
      </View>

      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: stateStyle.bg }]}>
        <Text style={[styles.statusBannerText, { color: stateStyle.text }]}>
          {t(`reports.${localState.replace('-', '')}`)}
        </Text>
      </View>

      {/* Info */}
      <Text style={styles.sectionTitle}>{t('reportDetail.info')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('reports.ward')}</Text>
          <Text style={styles.rowValue}>{report.wardName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('reports.date')}</Text>
          <Text style={styles.rowValue}>{report.createdAt.split('T')[0]}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Method</Text>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>{report.submissionMethod}</Text>
          </View>
        </View>
      </View>

      {/* Fields */}
      <Text style={styles.sectionTitle}>{t('reportDetail.fields')}</Text>
      <View style={styles.card}>
        {Object.entries(report.canonical).map(([key, value], idx, arr) => (
          <View key={key}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{key}</Text>
              <Text style={styles.rowValue}>{String(value)}</Text>
            </View>
            {idx < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Actions */}
      {isEditable(localState) && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>{t('reportDetail.submit')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: spacing['16'], paddingBottom: spacing['32'] },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: spacing['16'], marginBottom: spacing['16'] },
  backButton: { marginBottom: spacing['8'] },
  backText: { fontSize: 14, color: colors.primary600, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '600', color: colors.neutral900 },
  statusBanner: {
    padding: spacing['12'],
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing['16'],
  },
  statusBannerText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['16'],
    marginBottom: spacing['8'],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral200,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing['14'],
  },
  rowLabel: { fontSize: 14, color: colors.neutral500 },
  rowValue: { fontSize: 14, fontWeight: '500', color: colors.neutral900 },
  divider: { height: 1, backgroundColor: colors.neutral100, marginHorizontal: spacing['14'] },
  methodBadge: {
    backgroundColor: colors.neutral100,
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  methodBadgeText: { fontSize: 12, color: colors.neutral600, textTransform: 'capitalize' },
  primaryButton: {
    marginTop: spacing['24'],
    backgroundColor: colors.primary600,
    borderRadius: radius.lg,
    padding: spacing['14'],
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center' },
});
