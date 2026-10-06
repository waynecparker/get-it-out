import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SubscriptionSettings } from '@/components/subscription-settings';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth-context';
import { usePreferences } from '@/state/preferences-context';
import { StoragePreference } from '@/types/conversation';

const STORAGE_OPTIONS: { value: StoragePreference; label: string }[] = [
  { value: 'save_audio_and_transcript', label: 'Save audio and transcript' },
  { value: 'transcript_only', label: 'Transcript only' },
  { value: 'delete_after_session', label: 'Delete everything after each session' },
];

interface FutureRow {
  label: string;
  note: string;
}

const APP_ROWS: FutureRow[] = [
  { label: 'Export my data', note: 'Future' },
  { label: 'Listen to replies (spoken audio)', note: 'Future — off by default' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { storagePreference, setStoragePreference } = usePreferences();
  const { session, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle" style={styles.heading}>
          Settings
        </ThemedText>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          ACCOUNT
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.row}>
            <ThemedText style={styles.rowLabel} numberOfLines={1}>
              {session?.user.email}
            </ThemedText>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}
          >
            <ThemedText style={[styles.rowLabel, { color: theme.safety }]}>Sign out</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          SUBSCRIPTION
        </ThemedText>
        <SubscriptionSettings />

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          DEFAULT STORAGE
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {STORAGE_OPTIONS.map((option, index) => {
            const selected = storagePreference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setStoragePreference(option.value)}
                style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
              >
                <ThemedText style={styles.rowLabel}>{option.label}</ThemedText>
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? theme.accent : theme.textMuted },
                  ]}
                >
                  {selected && <View style={[styles.radioFill, { backgroundColor: theme.accent }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          PRIVACY
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Pressable onPress={() => router.push('/privacy')} style={styles.row}>
            <ThemedText style={styles.rowLabel}>Privacy</ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.rowNote}>
              History, account and app lock
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          ABOUT
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {APP_ROWS.map((row, index) => (
            <View
              key={row.label}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
            >
              <ThemedText themeColor="textMuted" style={styles.rowLabel}>
                {row.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.rowNote}>
                {row.note}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.attribution}>
          <ThemedText type="small" themeColor="textMuted" style={styles.attributionLine}>
            Created by Wayne Parker — The Mindset Man
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.attributionLine}>
            AI-powered responses shaped by Wayne Parker&apos;s direct, grounded coaching approach.
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six,
  },
  heading: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.four,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
  },
  rowNote: {
    flexShrink: 1,
    maxWidth: '42%',
    textAlign: 'right',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  attribution: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  attributionLine: {
    textAlign: 'center',
  },
});
