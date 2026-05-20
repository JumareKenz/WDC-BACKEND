import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient, type TokenResponse } from '@wdc/api-client';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; role: string; fullName: string; phone: string; lgaId: string | null; wardId: string | null } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (phone: string, pin: string, deviceId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEYS = {
  token: 'wdc:token',
  user: 'wdc:user',
  onboardingComplete: 'wdc:onboarding',
};

function createApi() {
  return createApiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100',
    getAccessToken: () => undefined,
  });
}

let api = createApi();

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet([STORAGE_KEYS.token, STORAGE_KEYS.user]).then((entries) => {
      const tokenEntry = entries[0]!;
      const userEntry = entries[1]!;
      if (cancelled) return;
      const tokenRaw = tokenEntry[1];
      const userRaw = userEntry[1];
      if (tokenRaw && userRaw) {
        try {
          const token = JSON.parse(tokenRaw) as TokenResponse;
          const user = JSON.parse(userRaw) as AuthState['user'];
          setState({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (phone: string, pin: string, deviceId: string) => {
    const res = await api.auth.signInMobile({ phone, pin, deviceId });
    // Build a local user object from the token payload (JWT)
    // In production, decode the JWT or fetch /users/me
    const payload = JSON.parse(atob(res.accessToken.split('.')[1] ?? '')) as Record<string, unknown>;
    const user = {
      id: String(payload.sub ?? ''),
      role: String(payload.role ?? 'secretary'),
      fullName: String(payload.fullName ?? ''),
      phone,
      lgaId: (payload.lgaId as string | null) ?? null,
      wardId: (payload.wardId as string | null) ?? null,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.token, JSON.stringify(res));
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    setState({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
    setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export { STORAGE_KEYS };
