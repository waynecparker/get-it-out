// Client-facing subscription info. Body: { action: 'status' | 'offer' }.
//   status → the caller's server-side subscription + founder state.
//   offer  → also decides which RevenueCat offering the paywall should show
//            ('founder' or 'standard'), reserving a founder slot for a short
//            checkout window when it hands out a founder offer.
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, getCaller, json } from '../_shared/guard.ts';

const GRACE_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: 'Not authenticated.' }, 401);

    const { action } = await req.json().catch(() => ({ action: 'status' }));
    const admin = adminClient();

    let offering: 'founder' | 'standard' | undefined;
    if (action === 'offer') {
      const { data, error } = await admin.rpc('claim_founder_offer', { p_user: user.id });
      if (error) throw error;
      offering = data === 'founder' ? 'founder' : 'standard';
    }

    const [{ data: sub }, { data: program }, { data: eligible }] = await Promise.all([
      admin
        .from('subscriptions')
        .select('status, plan, entitlement_active, current_period_end, trial_ends_at, will_renew, billing_issue_at, founder_number, founder_lapsed_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      admin.from('founder_program').select('cap, next_number').maybeSingle(),
      admin.rpc('founder_is_eligible', { p_user: user.id }),
    ]);

    const founder = sub?.founder_number
      ? {
          number: sub.founder_number as number,
          eligible: eligible === true,
          graceEndsAt: sub.founder_lapsed_at
            ? new Date(new Date(sub.founder_lapsed_at).getTime() + GRACE_DAYS * 86_400_000).toISOString()
            : null,
        }
      : null;

    return json({
      offering,
      foundersOpen: program ? program.next_number <= program.cap : false,
      founder,
      subscription: sub
        ? {
            status: sub.status,
            plan: sub.plan,
            entitlementActive: sub.entitlement_active,
            currentPeriodEnd: sub.current_period_end,
            trialEndsAt: sub.trial_ends_at,
            willRenew: sub.will_renew,
            billingIssue: sub.billing_issue_at != null,
          }
        : null,
    });
  } catch (error) {
    console.error('subscription function error', error);
    return json({ error: 'Unexpected server error.' }, 500);
  }
});
