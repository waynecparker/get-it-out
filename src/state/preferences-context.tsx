import { createContext, PropsWithChildren, use, useMemo, useState } from 'react';

import { StoragePreference } from '@/types/conversation';

interface PreferencesContextValue {
  storagePreference: StoragePreference;
  setStoragePreference: (preference: StoragePreference) => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [storagePreference, setStoragePreference] = useState<StoragePreference>(
    'save_audio_and_transcript',
  );
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      storagePreference,
      setStoragePreference,
      hasCompletedOnboarding,
      completeOnboarding: () => setHasCompletedOnboarding(true),
    }),
    [storagePreference, hasCompletedOnboarding],
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
