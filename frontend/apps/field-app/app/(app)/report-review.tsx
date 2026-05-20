import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockCoordinatorReports } from '../../src/lib/mock-coordinator';

export default function ReportReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useFormatMessage();
  const report = mockCoordinatorReports.find((r) => r.id === id);
  const [returnNotes, setReturnNotes] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);

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
    submitted: { bg: colors.infoBg, text: colors.infoText },
    in_review: { bg: colors.warningBg, text: colors.warningText },
    returned: { bg: colors.errorBg, text: colors.errorText },
    approved: { bg: colors.successBg, text: colors.successText },
  };

  const stateStyle = statusColors[report.state] ?? { bg: colors.neutral100, text: colors.neutral600 };

  const handleApprove = () => {
    Alert.alert(t('common.confirm'), t('coordinator.confirmApprove'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('coordinator.approve'),
        style: 'default',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleReturn = () => {
    if (!showReturnForm) {
      setShowReturnForm(true);
      return;
    }
    Alert.alert(t('common.confirm'), t('coordinator.confirmReturn'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('coordinator.return'),
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('coordinator.reviewReport')}</Text>
        </View>

        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: stateStyle.bg }]}>
          <Text style={[styles.statusBannerText, { color: stateStyle.text }]}>
            {t(`reports.${report.state.replace('-', '')}`)}
          </Text>
        </View>

        {/* Info */}
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
            <Text style={styles.rowLabel}>{t('coordinator.submittedBy')}</Text>
            <Text style={styles.rowValue}>{report.submittedBy}</Text>
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

        {/* Return notes form */}
        {showReturnForm && (
          <View style={[styles.card, { marginTop: spacing['16'] }]}>
            <View style={{ padding: spacing['14'] }}>
              <Text style={styles.notesLabel}>{t('coordinator.returnNotes')}</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={4}
                value={returnNotes}
                onChangeText={setReturnNotes}
                placeholder="Enter notes for the secretary..."
                placeholderTextColor={colors.neutral400}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {(report.state === 'submitted' || report.state === 'in_review') && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
            <Text style={styles.approveButtonText}>{t('coordinator.approve')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.returnButton, showReturnForm && styles.returnButtonActive]}
            onPress={handleReturn}
          >
            <Text
              style={[
                styles.returnButtonText,
                showReturnForm && styles.returnButtonTextActive,
              ]}
            >
              {showReturnForm ? t('coordinator.return') : t('action.return')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing['16'], paddingBottom: spacing['32'] },
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
  rowValue: { fontSize: 14, fontWeight: '500', color: colors.neutral900, flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.neutral100, marginHorizontal: spacing['14'] },
  methodBadge: {
    backgroundColor: colors.neutral100,
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  methodBadgeText: { fontSize: 12, color: colors.neutral600, textTransform: 'capitalize' },
  notesLabel: { fontSize: 13, fontWeight: '600', color: colors.neutral500, marginBottom: spacing['8'] },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius.md,
    padding: spacing['12'],
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: colors.neutral50,
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing['12'],
    padding: spacing['16'],
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    backgroundColor: colors.white,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.primary600,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  approveButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  returnButton: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral300,
  },
  returnButtonActive: { backgroundColor: colors.errorBg, borderColor: colors.error },
  returnButtonText: { color: colors.neutral700, fontSize: 15, fontWeight: '600' },
  returnButtonTextActive: { color: colors.error },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center' },
});
