import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockLgas } from '../../src/lib/mock-lgas';

export default function LgaScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = useCallback(() => {
    if (selected) {
      router.push({ pathname: '/(auth)/ward', params: { lgaId: selected } });
    }
  }, [selected, router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.selectLga')}</Text>
        <Text style={styles.subtitle}>Choose your Local Government Area</Text>
      </View>

      <FlatList
        data={mockLgas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, selected === item.id && styles.itemSelected]}
            onPress={() => setSelected(item.id)}
          >
            <View style={styles.itemRow}>
              <Text style={[styles.itemText, selected === item.id && styles.itemTextSelected]}>
                {item.name}
              </Text>
              {selected === item.id && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !selected && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.nextButtonText}>{t('common.next')} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: { padding: spacing['24'], paddingTop: spacing['32'] },
  title: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  subtitle: { fontSize: 14, color: colors.neutral500, marginTop: spacing['4'] },
  list: { padding: spacing['16'] },
  item: {
    padding: spacing['14'],
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    marginBottom: spacing['8'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  itemSelected: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary500,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: { fontSize: 15, color: colors.neutral700 },
  itemTextSelected: { color: colors.primary700, fontWeight: '600' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  footer: { padding: spacing['24'] },
  nextButton: {
    backgroundColor: colors.primary600,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
