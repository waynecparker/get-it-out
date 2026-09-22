import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

const ACCOUNT_ROWS: FutureRow[] = [
  { label: 'Export my data', note: 'Checkpoint 5' },
  { label: 'Delete individual conversations', note: 'Checkpoint 5' },
  { label: 'Delete my account and all data', note: 'Checkpoint 5' },
];

const APP_ROWS: FutureRow[] = [
  { label: 'Subscription status', note: 'Checkpoint 6' },
  { label: 'Privacy policy', note: 'Checkpoint 5' },
  { label: 'Terms and safety information', note: 'Checkpoint 5' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { storagePreference, setStoragePreference } = usePreferences();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle" style={styles.heading}>
          Settings
        </ThemedText>

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
                <ThemedText>{option.label}</ThemedText>
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
          YOUR DATA
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {ACCOUNT_ROWS.map((row, index) => (
            <View
              key={row.label}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
            >
              <ThemedText themeColor="textMuted">{row.label}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {row.note}
              </ThemedText>
            </View>
          ))}
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
              <ThemedText themeColor="textMuted">{row.label}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {row.note}
              </ThemedText>
            </View>
          ))}
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
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
});
