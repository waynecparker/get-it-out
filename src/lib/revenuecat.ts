import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// RevenueCat public SDK keys (safe to bundle — they only identify the
// project). Billing stays switched off in any build without the key for
// its platform, so development keeps working before the store accounts
// exist. In Expo Go the SDK runs in its own mock "Preview API" mode.
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

export const isBillingEnabled = Boolean(API_KEY);

let configured = false;

export function ensureRevenueCatConfigured() {
  if (!API_KEY || configured) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}
