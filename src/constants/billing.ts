// Subscription configuration. Store products, prices and the 7-day trial
// live in App Store Connect / Google Play and RevenueCat; the app reads
// real prices from the store and only uses these as labels and fallbacks.

// RevenueCat entitlement that unlocks the app.
export const ENTITLEMENT_ID = 'access';

// RevenueCat offering identifiers. Founding Members buy the founder
// products (price kept while eligible); everyone else buys standard.
export const OFFERING_IDS = {
  founder: 'founder',
  standard: 'standard',
} as const;

export type OfferingKind = keyof typeof OFFERING_IDS;

export const TRIAL_DAYS = 7;
export const FOUNDER_CAP = 500;

// Shown only if the store price can't be loaded.
export const FALLBACK_PRICES = {
  monthly: 'A$14.50',
  annual: 'A$145',
};

// Public legal pages, required on the paywall by Apple. Set these once the
// pages are published.
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || null;
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || null;
