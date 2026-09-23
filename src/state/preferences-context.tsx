import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth-context';
import { StoragePreference } from '@/types/conversation';

const ONBOARDING_STORAGE_KEY = 'has_completed_onboarding';

interface PreferencesContextValue {
  storagePreference: StoragePreference;
  setStoragePreference: (preference: StoragePreference) => void;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [storagePreference, setStoragePreferenceState] = useState<StoragePreference>(
    'save_audio_and_transcript',
  );
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isOnboardingFlagLoaded, setIsOnboardingFlagLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_STORAGE_KEY).then((value) => {
      if (value === 'true') setHasCompletedOnboarding(true);
      setIsOnboardingFlagLoaded(true);
    });
  }, []);

  const setLocallyRef = useRef(false);
  const storagePreferenceRef = useRef(storagePreference);
  useEffect(() => {
    storagePreferenceRef.current = storagePreference;
  }, [storagePreference]);

  useEffect(() => {
    if (!session) return;

    if (setLocallyRef.current) {
      // Picked during onboarding before an account existed — persist it now
      // that we have one, rather than letting the DB default win.
      supabase
        .from('user_preferences')
        .update({ storage_preference: storagePreferenceRef.current })
        .eq('user_id', session.user.id);
      return;
    }

    supabase
      .from('user_preferences')
      .select('storage_preference')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setStoragePreferenceState(data.storage_preference);
      });
  }, [session]);

  const setStoragePreference = useCallback(
    (preference: StoragePreference) => {
      setLocallyRef.current = true;
      setStoragePreferenceState(preference);
      if (session) {
        supabase
          .from('user_preferences')
          .update({ storage_preference: preference })
          .eq('user_id', session.user.id);
      }
    },
    [session],
  );

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    SecureStore.setItemAsync(ONBOARDING_STORAGE_KEY, 'true');
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      storagePreference,
      setStoragePreference,
      hasCompletedOnboarding,
      isLoading: !isOnboardingFlagLoaded,
      completeOnboarding,
    }),
    [storagePreference, setStoragePreference, hasCompletedOnboarding, isOnboardingFlagLoaded, completeOnboarding],
  );

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const context = use(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
