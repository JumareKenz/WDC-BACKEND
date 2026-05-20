import { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFormatMessage } from '@wdc/i18n';
import { Button } from '@wdc/design-system/native';
import { colors, spacing } from '@wdc/design-system';

const { width } = Dimensions.get('window');

const slides = [
  { titleKey: 'onboarding.slide1.title', bodyKey: 'onboarding.slide1.body' },
  { titleKey: 'onboarding.slide2.title', bodyKey: 'onboarding.slide2.body' },
  { titleKey: 'onboarding.slide3.title', bodyKey: 'onboarding.slide3.body' },
];

export default function CarouselScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex((i) => i + 1);
    } else {
      finishOnboarding();
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    finishOnboarding();
  }, []);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem('wdc:onboarding', 'true');
    router.replace('/(auth)/lga');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof slides)[number] }) => (
      <View style={styles.slide}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={styles.title}>{t(item.titleKey)}</Text>
        <Text style={styles.body}>{t(item.bodyKey)}</Text>
      </View>
    ),
    [t]
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
        <Button onPress={handleNext} size="lg">
          {currentIndex === slides.length - 1
            ? t('onboarding.getStarted')
            : t('common.next')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing['16'],
    paddingTop: spacing['24'],
  },
  skipText: { color: colors.neutral500, fontSize: 14, fontWeight: '500' },
  carousel: { flex: 1 },
  slide: {
    width,
    padding: spacing['24'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['24'],
  },
  iconText: { fontSize: 40, color: colors.primary600 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral900,
    textAlign: 'center',
    marginBottom: spacing['12'],
  },
  body: {
    fontSize: 16,
    color: colors.neutral500,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: spacing['24'],
    paddingBottom: spacing['32'],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing['16'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral300,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary600,
    width: 24,
  },
});
