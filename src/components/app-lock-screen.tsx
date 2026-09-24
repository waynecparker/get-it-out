import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MicGlyph } from '@/components/mic-glyph';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppLock } from '@/state/app-lock-context';

export function AppLockScreen() {
  const theme = useTheme();
  const { unlock } = useAppLock();

  return (
    <Screen>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
          <MicGlyph mode="idle" color={theme.textMuted} size={40} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Locked for privacy
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          Unlock with your fingerprint, face or device PIN to get back in.
        </ThemedText>
        <Button onPress={unlock}>Unlock</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
});
