// RevenueCat → Supabase webhook. The only writer of subscription state.
// Deployed with --no-verify-jwt: RevenueCat can't send a Supabase JWT, so it
// authenticates with the shared secret configured in the RevenueCat
// dashboard as the webhook's Authorization header (REVENUECAT_WEBHOOK_AUTH).
//
// Founding Member rules (see the subscriptions migration for the full list):
//   * A founder number is assigned the first time a user is PAID on a
//     founder product (not during the free trial).
//   * A trial on a founder product holds a founder slot until it ends.
//   * EXPIRATION starts the 90-day founder grace period; paying again on a
//     founder product inside it clears the lapse.
import { adminClient, json } from '../_shared/guard.ts';

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  period_type?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  environment?: string;
  store?: string;
  transferred_from?: string[];
  transferred_to?: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// We always log RevenueCat in with the Supabase user id before purchasing,
// but fall back to aliases in case a purchase started anonymously.
function resolveUserId(event: RevenueCatEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return candidates.find((id): id is string => typeof id === 'string' && UUID.test(id)) ?? null;
}

function isFounderProduct(productId: string | undefined) {
  if (!productId) return false;
  const match = (Deno.env.get('FOUNDER_PRODUCT_MATCH') ?? 'founder').toLowerCase();
  return productId.toLowerCase().includes(match);
}

// Constant-time comparison for the shared secret.
function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const ACTIVE_TYPES = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const provided = req.headers.get('Authorization') ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return json({ error: 'Unauthorized.' }, 401);
  }

  let event: RevenueCatEvent;
  try {
    event = (await req.json()).event;
    if (!event?.id || !event.type) throw new Error('missing event');
  } catch {
    return json({ error: 'Bad payload.' }, 400);
  }

  const admin = adminClient();
  // Only link the event to a user that actually exists. RevenueCat's
  // dashboard test events use made-up ids, and a user may have deleted
  // their account before a late event arrives — both must not fail.
  let userId = resolveUserId(event);
  if (userId) {
    const { data: profile } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) userId = null;
  }

  // Idempotency: RevenueCat retries until it gets a 2xx.
  const { error: logError } = await admin
    .from('revenuecat_events')
    .insert({ id: event.id, type: event.type, user_id: userId });
  if (logError) {
    if (logError.code === '23505') return json({ ok: true, duplicate: true });
    console.error('event log insert failed', logError);
    return json({ error: 'Storage error.' }, 500);
  }

  try {
    if (event.type === 'TEST') return json({ ok: true });

    if (event.type === 'TRANSFER') {
      // The entitlement moved to another app user (e.g. a restore on a
      // different account). Revoke it from the old owners; the new owner's
      // state arrives with their own events and on their next sync.
      const fromIds = (event.transferred_from ?? []).filter((id) => UUID.test(id));
      if (fromIds.length > 0) {
        await admin
          .from('subscriptions')
          .update({ entitlement_active: false, status: 'expired', last_event_at: new Date().toISOString() })
          .in('user_id', fromIds);
      }
      return json({ ok: true });
    }

    if (!userId) {
      console.warn('event without a known Supabase user', event.type, event.id);
      return json({ ok: true, ignored: 'no user' });
    }

    const eventTime = new Date(event.event_timestamp_ms ?? Date.now()).toISOString();
    const { data: existing } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await admin.from('subscriptions').insert({ user_id: userId, revenuecat_customer_id: event.original_app_user_id ?? userId });
    } else if (existing.last_event_at && existing.last_event_at > eventTime) {
      // Out-of-order delivery: an older event must not overwrite newer state.
      return json({ ok: true, ignored: 'stale' });
    }

    const productId = event.type === 'PRODUCT_CHANGE' ? (event.new_product_id ?? event.product_id) : event.product_id;
    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    const stillValid = event.expiration_at_ms ? event.expiration_at_ms > Date.now() : false;
    const isTrial = event.period_type === 'TRIAL';
    const founderProduct = isFounderProduct(productId);

    const update: Record<string, unknown> = {
      last_event_at: eventTime,
      environment: event.environment ?? null,
      store: event.store ?? null,
    };

    if (ACTIVE_TYPES.has(event.type)) {
      Object.assign(update, {
        entitlement_active: stillValid,
        status: isTrial ? 'trialing' : 'active',
        plan: founderProduct ? 'founding' : 'standard',
        product_id: productId ?? null,
        period_type: event.period_type?.toLowerCase() ?? null,
        current_period_end: expiresAt,
        trial_ends_at: isTrial ? expiresAt : existing?.trial_ends_at ?? null,
        will_renew: true,
        billing_issue_at: null,
      });
    } else if (event.type === 'CANCELLATION') {
      // Auto-renew turned off (or a refund). Access runs to expiration.
      Object.assign(update, { will_renew: false, status: 'canceled', entitlement_active: stillValid, current_period_end: expiresAt });
    } else if (event.type === 'BILLING_ISSUE') {
      update.billing_issue_at = eventTime;
    } else if (event.type === 'EXPIRATION') {
      Object.assign(update, { entitlement_active: false, status: 'expired', will_renew: false });
      if (existing?.founder_number && !existing.founder_lapsed_at) {
        update.founder_lapsed_at = eventTime; // starts the 90-day grace period
      }
    }

    const { error: updateError } = await admin.from('subscriptions').update(update).eq('user_id', userId);
    if (updateError) throw updateError;

    // Founder bookkeeping.
    if (ACTIVE_TYPES.has(event.type) && founderProduct && stillValid) {
      if (isTrial) {
        await admin.from('founder_holds').upsert({
          user_id: userId,
          kind: 'trial',
          expires_at: new Date((event.expiration_at_ms ?? Date.now()) + 2 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (existing?.founder_number) {
        // Back on a founder product: clear any lapse still inside the grace period.
        const { data: eligible } = await admin.rpc('founder_is_eligible', { p_user: userId });
        if (eligible) await admin.from('subscriptions').update({ founder_lapsed_at: null }).eq('user_id', userId);
      } else {
        const { data: founderNumber, error: assignError } = await admin.rpc('assign_founder_number', { p_user: userId });
        if (assignError) throw assignError;
        if (founderNumber == null) {
          // Should not happen thanks to holds — flagged for manual follow-up.
          console.warn('paid founder product but no founder slot left', userId);
        }
      }
    }
    if (event.type === 'EXPIRATION') {
      await admin.from('founder_holds').delete().eq('user_id', userId).eq('kind', 'trial');
    }

    return json({ ok: true });
  } catch (error) {
    console.error('webhook processing failed', event.type, event.id, error);
    // Let RevenueCat retry: remove the idempotency marker first.
    await admin.from('revenuecat_events').delete().eq('id', event.id);
    return json({ error: 'Processing failed.' }, 500);
  }
});
