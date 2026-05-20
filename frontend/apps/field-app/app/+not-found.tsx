import { View, Text, StyleSheet } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';

export default function NotFoundScreen() {
  const t = useFormatMessage();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.error')}</Text>
      <Text style={styles.body}>Page not found</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 16, color: '#666' },
});
