import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MicGlyph } from '@/components/mic-glyph';
import { ThemedText } from '@/components/themed-text';
import { TRIAL_DAYS } from '@/constants/billing';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscription } from '@/state/subscription-context';

// Shown on the Talk tab in place of the mic when there's no active trial or
// subscription. History and Settings stay available regardless.
export function SubscribeGate() {
  const theme = useTheme();
  const { serverStatus } = useSubscription();
  const founder = serverStatus?.founder;
  const returningFounder = founder?.eligible && founder.graceEndsAt;

  return (
    <View style={styles.container}>
      <View style={[styles.mic, { backgroundColor: theme.backgroundElement }]}>
        <MicGlyph mode="idle" color={theme.accent} size={56} />
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {returningFounder ? 'Welcome back' : 'Ready when you are'}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {returningFounder
          ? `Resubscribe to keep your Founding Member #${founder!.number} status.`
          : `Start your ${TRIAL_DAYS}-day free trial to say what's on your mind.`}
      </ThemedText>
      <Button onPress={() => router.push('/paywall')} style={styles.button}>
        {returningFounder ? 'See plans' : 'Start free trial'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  mic: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    fontSize: 16,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
