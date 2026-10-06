import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Purchases, { INTRO_ELIGIBILITY_STATUS, PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { FALLBACK_PRICES, FOUNDER_CAP, OfferingKind, PRIVACY_URL, TERMS_URL, TRIAL_DAYS } from '@/constants/billing';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscription } from '@/state/subscription-context';

type Period = 'monthly' | 'annual';

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Android only includes a free phase when Google says this user is
// eligible; on iOS we ask StoreKit separately (see trialEligible below).
function packageHasFreeTrial(pkg: PurchasesPackage) {
  return pkg.product.defaultOption?.freePhase != null || pkg.product.introPrice?.price === 0;
}

export default function PaywallScreen() {
  const theme = useTheme();
  const { billingEnabled, hasAccess, serverStatus, loadOffer, purchase, restore } = useSubscription();

  const [kind, setKind] = useState<OfferingKind>('standard');
  const [packages, setPackages] = useState<Partial<Record<Period, PurchasesPackage>>>({});
  const [selected, setSelected] = useState<Period>('monthly');
  const [trialEligible, setTrialEligible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { kind: offerKind, offering } = await loadOffer();
        if (cancelled) return;
        setKind(offerKind);
        if (offering) {
          setPackages({ monthly: offering.monthly ?? undefined, annual: offering.annual ?? undefined });
          if (Platform.OS === 'ios') {
            const ids = [offering.monthly, offering.annual].filter(Boolean).map((p) => p!.product.identifier);
            const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
            if (!cancelled) {
              setTrialEligible(
                Object.values(eligibility).some((e) => e.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE),
              );
            }
          }
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't load plans. Check your connection and try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOffer]);

  // Close as soon as access is granted (purchase, restore, or webhook sync).
  useEffect(() => {
    if (billingEnabled && hasAccess) router.back();
  }, [billingEnabled, hasAccess]);

  const pkg = packages[selected];
  const showTrial = pkg ? packageHasFreeTrial(pkg) && trialEligible : true;
  const price = (period: Period) => packages[period]?.product.priceString ?? FALLBACK_PRICES[period];
  const perMonth = packages.annual?.product.pricePerMonthString;
  const founder = serverStatus?.founder;
  const isFounderOffer = kind === 'founder';
  const isReturningFounder = Boolean(founder && founder.eligible && founder.graceEndsAt);

  async function handlePurchase() {
    if (!pkg) return;
    setIsBusy(true);
    const result = await purchase(pkg);
    setIsBusy(false);
    if (result.error) Alert.alert('Purchase not completed', result.error);
  }

  async function handleRestore() {
    setIsBusy(true);
    const result = await restore();
    setIsBusy(false);
    if (result.error) Alert.alert("Couldn't restore", result.error);
    else if (!result.ok) Alert.alert('Nothing to restore', `No active subscription was found for this ${STORE_NAME} account.`);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
          <ThemedText themeColor="textSecondary">Close</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          {showTrial ? `Start your ${TRIAL_DAYS}-day free trial` : 'Subscribe to Get It Out'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lead}>
          Talk it out whenever you need to. Full access, no ads.
        </ThemedText>

        {isFounderOffer && (
          <View style={[styles.founderCard, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {isReturningFounder ? `FOUNDING MEMBER #${founder!.number}` : 'FOUNDING MEMBER PRICING'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isReturningFounder
                ? `Welcome back. Resubscribe by ${formatDate(founder!.graceEndsAt!)} to keep your Founding Member status and price.`
                : `The first ${FOUNDER_CAP} paying subscribers become Founding Members and keep this price for as long as they stay subscribed — switch between monthly and annual anytime.`}
            </ThemedText>
          </View>
        )}

        {!billingEnabled ? (
          <ThemedText themeColor="textSecondary" style={styles.notice}>
            Subscriptions aren&apos;t switched on in this build yet.
          </ThemedText>
        ) : isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.notice} />
        ) : loadError || (!packages.monthly && !packages.annual) ? (
          <ThemedText themeColor="textSecondary" style={styles.notice}>
            {loadError ?? 'Plans are unavailable right now. Please try again later.'}
          </ThemedText>
        ) : (
          <View style={styles.plans}>
            {(['monthly', 'annual'] as Period[])
              .filter((period) => packages[period])
              .map((period) => {
                const isSelected = selected === period;
                return (
                  <Pressable
                    key={period}
                    onPress={() => setSelected(period)}
                    style={[
                      styles.plan,
                      { backgroundColor: theme.backgroundElement, borderColor: isSelected ? theme.accent : theme.border },
                    ]}
                  >
                    <View style={[styles.radio, { borderColor: isSelected ? theme.accent : theme.textMuted }]}>
                      {isSelected && <View style={[styles.radioFill, { backgroundColor: theme.accent }]} />}
                    </View>
                    <View style={styles.planText}>
                      <ThemedText type="smallBold">{period === 'monthly' ? 'Monthly' : 'Annual'}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {period === 'monthly'
                          ? `${price('monthly')} per month`
                          : `${price('annual')} per year${perMonth ? ` (${perMonth}/month)` : ''}`}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
          </View>
        )}

        {billingEnabled && pkg && (
          <>
            <Button onPress={handlePurchase} disabled={isBusy} style={styles.cta}>
              {isBusy ? 'One sec…' : showTrial ? 'Start free trial' : 'Subscribe'}
            </Button>
            <ThemedText type="small" themeColor="textMuted" style={styles.terms}>
              {showTrial
                ? `${TRIAL_DAYS} days free, then ${price(selected)} per ${selected === 'monthly' ? 'month' : 'year'}. `
                : `${price(selected)} per ${selected === 'monthly' ? 'month' : 'year'}. `}
              Renews automatically until cancelled. Cancel anytime in your {STORE_NAME} subscription settings
              {showTrial ? ' before the trial ends to avoid being charged' : ''}. You must be 18 or older.
            </ThemedText>
          </>
        )}

        {billingEnabled && (
          <Pressable onPress={handleRestore} disabled={isBusy} style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Restore purchases
            </ThemedText>
          </Pressable>
        )}

        {(TERMS_URL || PRIVACY_URL) && (
          <View style={styles.legal}>
            {TERMS_URL && (
              <Pressable onPress={() => Linking.openURL(TERMS_URL!)}>
                <ThemedText type="small" themeColor="textMuted">
                  Terms of Use
                </ThemedText>
              </Pressable>
            )}
            {PRIVACY_URL && (
              <Pressable onPress={() => Linking.openURL(PRIVACY_URL!)}>
                <ThemedText type="small" themeColor="textMuted">
                  Privacy Policy
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  close: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  lead: {
    fontSize: 16,
  },
  founderCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  notice: {
    marginVertical: Spacing.four,
    textAlign: 'center',
  },
  plans: {
    gap: Spacing.two,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  planText: {
    flex: 1,
    gap: 2,
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
  cta: {
    marginTop: Spacing.two,
  },
  terms: {
    textAlign: 'center',
  },
  link: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
  },
});
