import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { ConversationsProvider } from '@/state/conversations-context';
import { PreferencesProvider } from '@/state/preferences-context';

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

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={NavigationTheme}>
      <PreferencesProvider>
        <ConversationsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="history/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Conversation',
                headerBackTitle: 'History',
              }}
            />
          </Stack>
        </ConversationsProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
