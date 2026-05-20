import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, STORAGE_KEYS } from '../src/contexts/AuthContext';
import { useState } from 'react';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.onboardingComplete).then((val) => {
      setOnboardingComplete(val === 'true');
    });
  }, []);

  if (isLoading || onboardingComplete === null) {
    // Splash/loading state — could render a native splash here
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/carousel" />;
  }

  return <Redirect href="/(auth)/lga" />;
}
