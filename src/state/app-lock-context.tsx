import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/state/auth-context';

const APP_LOCK_STORAGE_KEY = 'app_lock_enabled';
// How long the app can sit backgrounded before returning requires another
// unlock. Short enough to matter, long enough that switching apps briefly
// (checking a notification, answering a call) doesn't re-lock every time.
const RELOCK_AFTER_MS = 30_000;

interface AppLockContextValue {
  isSupported: boolean;
  isEnabled: boolean;
  isLocked: boolean;
  setEnabled: (enabled: boolean) => Promise<{ error: string | null }>;
  unlock: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled, storedValue] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(APP_LOCK_STORAGE_KEY),
      ]);
      const supported = hasHardware && isEnrolled;
      setIsSupported(supported);
      const enabled = supported && storedValue === 'true';
      setIsEnabledState(enabled);
      // Require authentication at launch when it's on.
      setIsLocked(enabled);
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (nextState === 'active' && isEnabled) {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (backgroundedAt && Date.now() - backgroundedAt > RELOCK_AFTER_MS) {
          setIsLocked(true);
        }
      }
    });
    return () => subscription.remove();
  }, [isEnabled]);

  const setEnabled = useCallback(
    async (enabled: boolean): Promise<{ error: string | null }> => {
      if (!enabled) {
        setIsEnabledState(false);
        await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, 'false');
        return { error: null };
      }

      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !isEnrolled) {
        return {
          error:
            "This device doesn't have a fingerprint, face or PIN set up that Get It Out can use, so app lock has to stay off.",
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to turn on app lock',
      });
      if (!result.success) {
        return { error: null }; // user just cancelled — not an error, simply not enabled
      }

      setIsEnabledState(true);
      await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, 'true');
      return { error: null };
    },
    [],
  );

  const unlock = useCallback(async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Get It Out' });
    if (result.success) {
      setIsLocked(false);
      return true;
    }
    // Never trap the user behind a lock screen that can no longer be
    // satisfied on this device (e.g. biometrics/PIN were removed since).
    if (!result.success && 'error' in result && (result.error === 'not_enrolled' || result.error === 'lockout')) {
      setIsEnabledState(false);
      await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, 'false');
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  // Signing out (no session) makes the lock moot — nothing sensitive to
  // protect on the auth/onboarding screens themselves.
  const value: AppLockContextValue = {
    isSupported,
    isEnabled,
    isLocked: isLocked && Boolean(session),
    setEnabled,
    unlock,
  };

  return <AppLockContext value={value}>{children}</AppLockContext>;
}

export function useAppLock() {
  const context = use(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
}
