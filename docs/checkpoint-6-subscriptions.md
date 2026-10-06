# Checkpoint 6 — Subscriptions, Founding Members and fair use

Status: code complete on branch `checkpoint-6`. Migration
`20261006120000` applied and all five Edge Functions deployed to the live
Supabase project on 2026-10-07 (live checks passed). **Billing is switched off**
in every build until the RevenueCat keys below are added, and server-side
enforcement stays off until `SUBSCRIPTION_ENFORCEMENT=on`. Nothing here
charges anyone until Wayne activates it.

## Commercial rules (approved 2026-09-29)

- A$14.50/month or A$145/year, 7-day free trial, no free tier, 18+.
- The first 500 **paying** subscribers are Founding Members. Trials don't
  count until they convert.
- Founders keep the founding price while eligible and can switch
  monthly ↔ annual without losing status.
- 90-day grace period to recover founder status after the subscription
  ends.
- Subscriber 501+ gets the same launch price, but not grandfathered.
- Founder status closes automatically after #500.
- No advertised usage limit, no top-ups; usage is metered internally with
  fair-use protection.

### How the rules are implemented (confirmed by Wayne 2026-10-07)

- **Two sets of store products.** "Founder" products (monthly + annual)
  and "standard" products (monthly + annual), all A$14.50 / A$145 at
  launch. Founders are only ever sold founder products, so a later price
  rise on the standard products never touches them. Switching monthly ↔
  annual stays inside the founder products.
- **Founder number** is assigned when someone is first *paid* on a founder
  product. Numbers are never reused — not when a founder deletes their
  account, and not when one loses founder status after the grace period.
- **Slot holds.** While someone is at checkout (1 hour) or in a free trial
  on a founder product (until the trial ends + 2 days), their founder slot
  is held. Founder products are only offered while founders + holds < 500,
  so they can never be oversold.
- **The 90 days start when access actually ends** (RevenueCat
  `EXPIRATION`), not when the user turns off auto-renew. Turning off
  auto-renew keeps founder status for the rest of the paid period.
- **Founder offers after a lapse.** A founder inside the 90 days sees the
  founder products again and keeps their number on resubscribing. After 90
  days they see standard products.

## Architecture

| Piece | Where |
|---|---|
| Founder program, holds, webhook event log, usage metering, 18+ fix | `supabase/migrations/20261006120000_subscriptions_founders_usage.sql` |
| RevenueCat → Supabase webhook (only writer of subscription state) | `supabase/functions/revenuecat-webhook` |
| Founder status + which offering to show | `supabase/functions/subscription` |
| Auth, subscription check, fair use, metering for paid features | `supabase/functions/_shared/guard.ts` (used by `transcribe`, `ai-response`) |
| RevenueCat SDK setup | `src/lib/revenuecat.ts` |
| Subscription state (entitlement, founder status, purchase/restore) | `src/state/subscription-context.tsx` |
| Paywall | `src/app/paywall.tsx` |
| Talk-tab gate (History and Settings always stay open) | `src/components/subscribe-gate.tsx` |
| Settings → Subscription | `src/components/subscription-settings.tsx` |

RevenueCat customer id = Supabase user id (`Purchases.logIn`), so a
purchase always belongs to the signed-in account.

## Fair-use defaults (internal, never advertised; confirmed 2026-10-07)

Per user, rolling 24 hours, overridable with Edge Function secrets without
a redeploy:

| Secret | Default |
|---|---|
| `FAIR_USE_AI_REPLIES_PER_DAY` | 300 |
| `FAIR_USE_AI_REPLIES_PER_10_MIN` | 40 |
| `FAIR_USE_TRANSCRIPTION_REQUESTS_PER_DAY` | 300 |
| `FAIR_USE_TRANSCRIPTION_REQUESTS_PER_10_MIN` | 40 |
| `FAIR_USE_AUDIO_MINUTES_PER_DAY` | 240 |

`usage_events` stores counts only (audio seconds, tokens, timestamps),
never content.

## What Wayne needs to set up

1. ~~Supabase access token~~ — done 2026-10-07. The new token can run SQL
   and deploy functions but can't read/write Edge Function secrets, so
   the secrets in step 4 need either a token with secrets permissions or
   the dashboard (Edge Functions → Secrets).
2. **Google Play Console** — app `com.waynecparker.getitout`, then two
   subscriptions, each with a monthly and an annual base plan at A$14.50 /
   A$145 and a 7-day free-trial offer:
   - founder subscription (product id must contain `founder`, e.g.
     `getitout_founder`)
   - standard subscription (e.g. `getitout_standard`)
   An APK/AAB must be uploaded to a testing track before Play lets you
   create subscriptions; license testers are needed for sandbox purchases.
3. **RevenueCat project** with the Play app connected (service-account
   credentials), then:
   - entitlement `access` attached to all four products
   - offering `founder` with monthly + annual packages (founder products)
   - offering `standard` (set as **current**) with the standard products
   - webhook URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
     with an Authorization header value you choose
4. **Edge Function secrets** (dashboard → Edge Functions → Secrets):
   - `REVENUECAT_WEBHOOK_AUTH` = the webhook Authorization value
   - optional `REVENUECAT_SECRET_API_KEY` (lets account deletion also
     delete the RevenueCat customer)
   - `SUBSCRIPTION_ENFORCEMENT=on` only at launch
5. **EAS environment variables** (preview, later production):
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_TERMS_URL`,
   `EXPO_PUBLIC_PRIVACY_URL`. Production also still needs the two
   Supabase values.
6. **iOS** — App Store Connect app, the same four products in one
   subscription group, then `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. Not needed
   for Android testing.
7. **Legal pages** — published Terms and Privacy URLs (Apple requires them
   on the paywall).

## Test plan once the accounts exist

Sandbox only (Play license testers / Apple sandbox), per
`docs/Wkr 1-5 files/Wkr4_Beta_and_Production_Readiness.md` B01–B07:
paywall shows AU prices and trial terms; purchase, cancel and restore;
restore on a second device; renewal, expiry and billing issue; trial
conversion assigns founder #1; account switch doesn't leak entitlement;
account deletion explains store cancellation.
