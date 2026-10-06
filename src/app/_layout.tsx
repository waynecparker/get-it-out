import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppLockScreen } from '@/components/app-lock-screen';
import { Colors } from '@/constants/theme';
import { AppLockProvider, useAppLock } from '@/state/app-lock-context';
import { AuthProvider } from '@/state/auth-context';
import { ConversationsProvider } from '@/state/conversations-context';
import { PreferencesProvider } from '@/state/preferences-context';
import { cleanupAbandonedTempRecordings } from '@/state/startup-cleanup';
import { SubscriptionProvider } from '@/state/subscription-context';

SplashScreen.preventAutoHideAsync();

const NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElevated,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.accent,
  },
};

function AppNavigator() {
  const { isLocked } = useAppLock();

  if (isLocked) {
    return <AppLockScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="auth/index" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="history/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Conversation',
          headerBackTitle: 'History',
        }}
      />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="privacy"
        options={{
          headerShown: true,
          headerTitle: 'Privacy',
          headerBackTitle: 'Settings',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    cleanupAbandonedTempRecordings();
  }, []);

  return (
    <ThemeProvider value={NavigationTheme}>
      <AuthProvider>
        <SubscriptionProvider>
          <PreferencesProvider>
            <ConversationsProvider>
              <AppLockProvider>
                <AppNavigator />
              </AppLockProvider>
            </ConversationsProvider>
          </PreferencesProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
