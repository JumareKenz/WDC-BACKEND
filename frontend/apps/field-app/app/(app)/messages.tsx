import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockMessages } from '../../src/lib/mock-messages';

export default function MessagesScreen() {
  const t = useFormatMessage();
  const [messages, setMessages] = useState(mockMessages);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markRead = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const filtered = filter === 'unread' ? messages.filter((m) => !m.read) : messages;
  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('messages.title')}</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadCountBadge}>
            <Text style={styles.unreadCountText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            {t('reportsList.filter.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterChipText, filter === 'unread' && styles.filterChipTextActive]}>
            {t('messages.unread')}
          </Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✉</Text>
          <Text style={styles.emptyText}>{t('messages.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => markRead(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.cardFrom}>
                {t('messages.from')}: {item.from}
              </Text>
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.cardDate}>{item.createdAt.split('T')[0]}</Text>
            </TouchableOpacity>
          )}
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
    alignItems: 'center',
    gap: spacing['10'],
  },
  title: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  unreadCountBadge: {
    backgroundColor: colors.error,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['6'],
  },
  unreadCountText: { fontSize: 12, fontWeight: '600', color: colors.white },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing['16'],
    gap: spacing['8'],
    marginBottom: spacing['12'],
  },
  filterChip: {
    paddingHorizontal: spacing['12'],
    paddingVertical: spacing['6'],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral300,
  },
  filterChipActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  filterChipText: { fontSize: 13, color: colors.neutral600 },
  filterChipTextActive: { color: colors.white, fontWeight: '500' },
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
    borderLeftColor: colors.primary500,
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['6'],
  },
  cardSubject: { fontSize: 15, fontWeight: '600', color: colors.neutral900, flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary500,
    marginLeft: spacing['8'],
  },
  cardFrom: { fontSize: 13, color: colors.neutral500, marginBottom: spacing['4'] },
  cardBody: { fontSize: 14, color: colors.neutral600, marginBottom: spacing['6'] },
  cardDate: { fontSize: 12, color: colors.neutral400 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: spacing['12'] },
  emptyText: { fontSize: 16, color: colors.neutral500 },
});
