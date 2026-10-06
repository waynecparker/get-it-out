import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppLock } from '@/state/app-lock-context';
import { useAuth } from '@/state/auth-context';
import { useConversations } from '@/state/conversations-context';

export default function PrivacyScreen() {
  const theme = useTheme();
  const { deleteAccount } = useAuth();
  const { deleteAllHistory } = useConversations();
  const { isSupported, isEnabled, setEnabled } = useAppLock();
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  function confirmDeleteAllHistory() {
    Alert.alert(
      "Delete everything you've saved?",
      "This permanently deletes every saved recording, transcript and reply. Once it's gone, it's gone.",
      [
        { text: 'Keep my history', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingHistory(true);
            const { error } = await deleteAllHistory();
            setIsDeletingHistory(false);
            if (error) {
              Alert.alert("Couldn't delete your history", error);
            }
          },
        },
      ],
    );
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and everything you\'ve saved—recordings, transcripts and replies. This cannot be undone.\n\nDeleting your account doesn\'t cancel a subscription. If you have one, cancel it in your App Store or Google Play subscription settings so you aren\'t charged again.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Permanently delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            const { error } = await deleteAccount();
            setIsDeletingAccount(false);
            if (error) {
              Alert.alert("Couldn't delete your account", error);
              return;
            }
            router.replace('/auth');
          },
        },
      ],
    );
  }

  async function handleToggleAppLock(next: boolean) {
    setIsTogglingLock(true);
    const { error } = await setEnabled(next);
    setIsTogglingLock(false);
    if (error) {
      Alert.alert('App lock', error);
    }
  }

  return (
    <Screen noPadding>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Your stuff is yours.</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.paragraph}>
          Nothing is added to your history unless you choose to save it. If you delete something, we delete the
          recording, transcript and replies—not just the picture of it on your screen.
        </ThemedText>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          WHAT A SAVED CONVERSATION CONTAINS
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText themeColor="textSecondary" style={styles.cardText}>
            When you tap &quot;Save to history&quot;, every recording, transcript and reply from that conversation is
            saved, in order, under your account. Nothing is saved before you choose to save it.
          </ThemedText>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          APP LOCK
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText style={styles.rowLabel}>App lock</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Use your fingerprint, face or device PIN to keep your conversations private.
              </ThemedText>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggleAppLock}
              disabled={!isSupported || isTogglingLock}
              trackColor={{ true: theme.accent }}
            />
          </View>
          {!isSupported && (
            <ThemedText type="small" themeColor="textMuted" style={styles.rowFootnote}>
              This device doesn&apos;t have a fingerprint, face or PIN set up that Get It Out can use, so app lock
              can&apos;t be turned on.
            </ThemedText>
          )}
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          DANGER ZONE
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Button
            variant="secondary"
            onPress={confirmDeleteAllHistory}
            disabled={isDeletingHistory}
            style={styles.dangerButton}
          >
            {isDeletingHistory ? 'Deleting…' : 'Delete all history'}
          </Button>
          <Button
            variant="secondary"
            onPress={confirmDeleteAccount}
            disabled={isDeletingAccount}
            style={{ width: '100%', borderColor: theme.safety }}
          >
            {isDeletingAccount ? 'Deleting…' : 'Delete account and data'}
          </Button>
        </View>

        <ThemedText type="small" themeColor="textMuted" style={styles.disclaimer}>
          Get It Out gives you somewhere to talk things through. It isn&apos;t therapy, counselling or an emergency
          service.
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  paragraph: {
    marginTop: Spacing.two,
    lineHeight: 20,
  },
  sectionLabel: {
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardText: {
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowFootnote: {
    lineHeight: 18,
  },
  dangerButton: {
    width: '100%',
  },
  disclaimer: {
    marginTop: Spacing.four,
    lineHeight: 18,
    textAlign: 'center',
  },
});
