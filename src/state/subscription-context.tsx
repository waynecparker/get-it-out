import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react';
import Purchases, {
  CustomerInfo,
  PURCHASES_ERROR_CODE,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { ENTITLEMENT_ID, OFFERING_IDS, OfferingKind } from '@/constants/billing';
import { ensureRevenueCatConfigured, isBillingEnabled } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth-context';

export interface FounderStatus {
  number: number;
  eligible: boolean;
  graceEndsAt: string | null;
}

interface ServerStatus {
  foundersOpen: boolean;
  founder: FounderStatus | null;
}

interface ActionResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}

interface SubscriptionContextValue {
  billingEnabled: boolean;
  // False until the first entitlement check for the signed-in user is done.
  isReady: boolean;
  hasAccess: boolean;
  customerInfo: CustomerInfo | null;
  serverStatus: ServerStatus | null;
  refresh: () => Promise<void>;
  loadOffer: () => Promise<{ kind: OfferingKind; offering: PurchasesOffering | null }>;
  purchase: (pkg: PurchasesPackage) => Promise<ActionResult>;
  restore: () => Promise<ActionResult>;
  manage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function entitlementActive(info: CustomerInfo | null) {
  return Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
}

async function fetchServerStatus(action: 'status' | 'offer') {
  const { data, error } = await supabase.functions.invoke('subscription', { body: { action } });
  if (error) throw error;
  return data as ServerStatus & { offering?: OfferingKind };
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  // Tagged with the user it belongs to, so a previous account's founder
  // details are never shown after switching accounts.
  const [serverState, setServerState] = useState<{ userId: string; status: ServerStatus } | null>(null);
  const [readyForUser, setReadyForUser] = useState<string | null>(null);
  const serverStatus = serverState && serverState.userId === userId ? serverState.status : null;

  const refreshServerStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const { foundersOpen, founder } = await fetchServerStatus('status');
      setServerState({ userId, status: { foundersOpen, founder } });
    } catch {
      // Founder details are informational — never block the app on them.
    }
  }, [userId]);

  // Keep RevenueCat's customer id in lockstep with the Supabase user, so a
  // purchase always belongs to the account that made it.
  useEffect(() => {
    if (!isBillingEnabled) return;
    ensureRevenueCatConfigured();
    let cancelled = false;

    (async () => {
      try {
        if (userId) {
          const { customerInfo: info } = await Purchases.logIn(userId);
          if (!cancelled) setCustomerInfo(info);
        } else {
          if (!(await Purchases.isAnonymous())) await Purchases.logOut();
          if (!cancelled) setCustomerInfo(null);
        }
      } catch {
        if (!cancelled) setCustomerInfo(null);
      } finally {
        if (!cancelled) setReadyForUser(userId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!isBillingEnabled) return;
    ensureRevenueCatConfigured();
    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { foundersOpen, founder } = await fetchServerStatus('status');
        if (!cancelled) setServerState({ userId, status: { foundersOpen, founder } });
      } catch {
        // Informational only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (isBillingEnabled) {
      try {
        setCustomerInfo(await Purchases.getCustomerInfo());
      } catch {
        // Keep the last known state.
      }
    }
    await refreshServerStatus();
  }, [refreshServerStatus]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      billingEnabled: isBillingEnabled,
      isReady: !isBillingEnabled || (userId !== null && readyForUser === userId),
      // With billing switched off (development builds without store keys)
      // the app stays fully usable.
      hasAccess: !isBillingEnabled || entitlementActive(customerInfo),
      customerInfo,
      serverStatus,
      refresh,
      async loadOffer() {
        let kind: OfferingKind = 'standard';
        try {
          const status = await fetchServerStatus('offer');
          kind = status.offering === 'founder' ? 'founder' : 'standard';
          if (userId) setServerState({ userId, status: { foundersOpen: status.foundersOpen, founder: status.founder } });
        } catch {
          // Server unreachable: fall back to RevenueCat's current offering.
        }
        if (!isBillingEnabled) return { kind, offering: null };
        const offerings = await Purchases.getOfferings();
        return { kind, offering: offerings.all[OFFERING_IDS[kind]] ?? offerings.current };
      },
      async purchase(pkg) {
        try {
          const { customerInfo: info } = await Purchases.purchasePackage(pkg);
          setCustomerInfo(info);
          refreshServerStatus();
          return { ok: entitlementActive(info) };
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { ok: false, cancelled: true };
          return { ok: false, error: (error as Error).message };
        }
      },
      async restore() {
        try {
          const info = await Purchases.restorePurchases();
          setCustomerInfo(info);
          refreshServerStatus();
          return { ok: entitlementActive(info) };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
      async manage() {
        await Purchases.showManageSubscriptions();
      },
    }),
    [customerInfo, serverStatus, readyForUser, userId, refresh, refreshServerStatus],
  );

  return <SubscriptionContext value={value}>{children}</SubscriptionContext>;
}

export function useSubscription() {
  const context = use(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
