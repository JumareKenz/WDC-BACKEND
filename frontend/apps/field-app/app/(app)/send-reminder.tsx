import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockWardsForCoordinator } from '../../src/lib/mock-coordinator';

export default function SendReminderScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedWards, setSelectedWards] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const toggleWard = (id: string) => {
    setSelectedWards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedWards(new Set());
      setSelectAll(false);
    } else {
      setSelectedWards(new Set(mockWardsForCoordinator.map((w) => w.id)));
      setSelectAll(true);
    }
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert(t('common.error'), 'Please fill in both subject and message');
      return;
    }
    if (selectedWards.size === 0) {
      Alert.alert(t('common.error'), 'Please select at least one ward');
      return;
    }
    Alert.alert(t('common.confirm'), t('coordinator.reminderSent'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('coordinator.sendReminder')}</Text>
        </View>

        {/* Ward selection */}
        <Text style={styles.sectionTitle}>{t('coordinator.selectWards')}</Text>
        <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll}>
          <View style={[styles.checkbox, selectAll && styles.checkboxChecked]}>
            {selectAll && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.selectAllText}>{t('coordinator.allWards')}</Text>
        </TouchableOpacity>

        {mockWardsForCoordinator.map((ward) => {
          const selected = selectedWards.has(ward.id);
          return (
            <TouchableOpacity
              key={ward.id}
              style={[styles.wardRow, selected && styles.wardRowSelected]}
              onPress={() => toggleWard(ward.id)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.wardInfo}>
                <Text style={styles.wardName}>{ward.name}</Text>
                <Text style={styles.wardCount}>
                  {t('coordinator.wardReports', { count: String(ward.reportCount) })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Message form */}
        <Text style={styles.sectionTitle}>{t('coordinator.reminderTo')}</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>{t('coordinator.reminderSubject')}</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Monthly report reminder"
            placeholderTextColor={colors.neutral400}
          />
          <View style={styles.divider} />
          <Text style={styles.label}>{t('coordinator.reminderBody')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            placeholder="Please submit your ward monthly report by Friday..."
            placeholderTextColor={colors.neutral400}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!subject || !body || selectedWards.size === 0) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!subject || !body || selectedWards.size === 0}
          >
            <Text style={styles.sendButtonText}>{t('action.sendReminder')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scrollContent: { padding: spacing['16'], paddingBottom: spacing['32'] },
  header: { paddingTop: spacing['16'], marginBottom: spacing['16'] },
  backButton: { marginBottom: spacing['8'] },
  backText: { fontSize: 14, color: colors.primary600, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '600', color: colors.neutral900 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['20'],
    marginBottom: spacing['10'],
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['10'],
    marginBottom: spacing['4'],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing['12'],
  },
  checkboxChecked: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  selectAllText: { fontSize: 15, fontWeight: '600', color: colors.neutral900 },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['12'],
    marginBottom: spacing['8'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  wardRowSelected: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary50,
  },
  wardInfo: { flex: 1 },
  wardName: { fontSize: 14, fontWeight: '500', color: colors.neutral900 },
  wardCount: { fontSize: 12, color: colors.neutral500, marginTop: 2 },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.neutral500, marginBottom: spacing['6'] },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius.md,
    padding: spacing['12'],
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: colors.neutral50,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  divider: { height: 1, backgroundColor: colors.neutral100, marginVertical: spacing['14'] },
  footerActions: { marginTop: spacing['20'] },
  sendButton: {
    backgroundColor: colors.primary600,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
