import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockAlerts } from '../../src/lib/mock-messages';

const typeColors: Record<string, { icon: string; color: string; bg: string }> = {
  reportReturned: { icon: '↩', color: colors.error, bg: colors.errorBg },
  reportApproved: { icon: '✓', color: colors.success, bg: colors.successBg },
  reportSubmitted: { icon: '📨', color: colors.info, bg: colors.infoBg },
  reminder: { icon: '⏰', color: colors.warning, bg: colors.warningBg },
  feedback: { icon: '💬', color: colors.aiPurple, bg: colors.aubergineSoft },
};

export default function AlertsScreen() {
  const t = useFormatMessage();
  const [alerts, setAlerts] = useState(mockAlerts);

  const markRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  const alertLabel = (type: string) => {
    if (type === 'reportReturned') return t('alerts.reportReturned');
    if (type === 'reportApproved') return t('alerts.reportApproved');
    return type;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('alerts.title')}</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
            <Text style={styles.markAllText}>{t('alerts.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>{t('alerts.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const typeStyle = typeColors[item.type] || { icon: '●', color: colors.warning, bg: colors.warningBg };
            return (
              <TouchableOpacity
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => markRead(item.id)}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: typeStyle.bg }]}>
                    <Text style={[styles.iconText, { color: typeStyle.color }]}>
                      {typeStyle.icon}
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{alertLabel(item.type)}</Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={styles.cardDate}>{item.createdAt.split('T')[0]}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    padding: spacing['16'],
    paddingTop: spacing['24'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  subtitle: { fontSize: 13, color: colors.neutral500, marginTop: spacing['4'] },
  markAllButton: {
    paddingHorizontal: spacing['12'],
    paddingVertical: spacing['6'],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary300,
  },
  markAllText: { fontSize: 13, color: colors.primary600, fontWeight: '500' },
  list: { paddingHorizontal: spacing['16'], paddingBottom: spacing['24'] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginBottom: spacing['10'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  cardUnread: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary200,
  },
  cardRow: { flexDirection: 'row', gap: spacing['12'] },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 18 },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['4'],
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral900, flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary500,
    marginLeft: spacing['8'],
  },
  cardMessage: { fontSize: 13, color: colors.neutral600, marginBottom: spacing['6'] },
  cardDate: { fontSize: 12, color: colors.neutral400 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: spacing['12'] },
  emptyText: { fontSize: 16, color: colors.neutral500 },
});
