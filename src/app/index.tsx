import { Redirect } from 'expo-router';

import { usePreferences } from '@/state/preferences-context';

export default function Index() {
  const { hasCompletedOnboarding } = usePreferences();

  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/onboarding'} />;
}
