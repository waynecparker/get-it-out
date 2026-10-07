import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ENTITLEMENT_ID } from '@/constants/billing';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscription } from '@/state/subscription-context';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// The SUBSCRIPTION block in Settings: plain status, Founding Member badge,
// and the manage / restore actions.
export function SubscriptionSettings() {
  const theme = useTheme();
  const { billingEnabled, customerInfo, serverStatus, manage, restore, refresh } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);

  // Fresh subscription + founder status every time Settings opens.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
  const founder = serverStatus?.founder;

  let status = 'Not subscribed';
  if (!billingEnabled) {
    status = 'Not switched on in this build';
  } else if (entitlement?.billingIssueDetectedAt) {
    status = 'Payment problem — update your payment method in your store settings';
  } else if (entitlement) {
    const date = entitlement.expirationDate ? formatDate(entitlement.expirationDate) : null;
    if (entitlement.periodType === 'TRIAL') status = date ? `Free trial — ends ${date}` : 'Free trial';
    else if (entitlement.willRenew) status = date ? `Active — renews ${date}` : 'Active';
    else status = date ? `Cancelled — access until ${date}` : 'Cancelled';
  }

  let founderLine: string | null = null;
  if (founder?.eligible) {
    founderLine = founder.graceEndsAt
      ? `Founding Member #${founder.number} — resubscribe by ${formatDate(founder.graceEndsAt)} to keep it`
      : `Founding Member #${founder.number}`;
  }

  async function handleRestore() {
    setIsRestoring(true);
    const result = await restore();
    setIsRestoring(false);
    if (result.error) Alert.alert("Couldn't restore", result.error);
    else Alert.alert(result.ok ? 'Restored' : 'Nothing to restore', result.ok ? 'Your subscription is active.' : 'No active subscription was found.');
  }

  const rowBorder = { borderTopWidth: 1, borderTopColor: theme.border };

  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.row}>
        <View style={styles.statusText}>
          <ThemedText style={styles.rowLabel}>{status}</ThemedText>
          {founderLine && (
            <ThemedText type="small" style={{ color: theme.accent }}>
              {founderLine}
            </ThemedText>
          )}
        </View>
      </View>
      {billingEnabled && (
        <>
          <Pressable
            onPress={() => (entitlement ? manage() : router.push('/paywall'))}
            style={[styles.row, rowBorder]}
          >
            <ThemedText style={styles.rowLabel}>{entitlement ? 'Manage subscription' : 'See plans'}</ThemedText>
          </Pressable>
          <Pressable onPress={handleRestore} disabled={isRestoring} style={[styles.row, rowBorder]}>
            <ThemedText style={styles.rowLabel}>{isRestoring ? 'Restoring…' : 'Restore purchases'}</ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.four,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    flexShrink: 1,
  },
});
