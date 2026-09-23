import { Redirect } from 'expo-router';

import { Screen } from '@/components/screen';
import { useAuth } from '@/state/auth-context';
import { usePreferences } from '@/state/preferences-context';

export default function Index() {
  const { hasCompletedOnboarding, isLoading: isPreferencesLoading } = usePreferences();
  const { session, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading || isPreferencesLoading) {
    return <Screen />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/auth" />;
}
