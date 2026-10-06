// Shared request guard for the paid features (transcribe, ai-response):
// identifies the caller, checks their subscription when enforcement is on,
// applies fair-use limits, and records internal usage metering.
import { createClient, SupabaseClient, User } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from './cors.ts';

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

// Resolves the signed-in user from the caller's JWT. The anon key alone is
// a valid JWT at the gateway, so this is what actually stops unauthenticated
// use of the paid features.
export async function getCaller(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

type UsageKind = 'transcription' | 'ai_response';

function envNumber(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Generous defaults — internal abuse protection, never advertised as a
// limit. Each can be tuned with an Edge Function secret without a deploy.
const LIMITS = {
  ai_response: {
    perDay: () => envNumber('FAIR_USE_AI_REPLIES_PER_DAY', 300),
    burst: () => envNumber('FAIR_USE_AI_REPLIES_PER_10_MIN', 40),
  },
  transcription: {
    perDay: () => envNumber('FAIR_USE_TRANSCRIPTION_REQUESTS_PER_DAY', 300),
    burst: () => envNumber('FAIR_USE_TRANSCRIPTION_REQUESTS_PER_10_MIN', 40),
    audioMinutesPerDay: () => envNumber('FAIR_USE_AUDIO_MINUTES_PER_DAY', 240),
  },
};

// Returns an error Response if the caller may not use this feature right
// now, or null to proceed.
export async function checkAccess(admin: SupabaseClient, userId: string, kind: UsageKind): Promise<Response | null> {
  if (Deno.env.get('SUBSCRIPTION_ENFORCEMENT') === 'on') {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('entitlement_active, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    const active = sub?.entitlement_active === true
      && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    if (!active) {
      return json({ error: 'An active subscription is required.', code: 'subscription_required' }, 402);
    }
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent, error } = await admin
    .from('usage_events')
    .select('created_at, audio_seconds')
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', dayAgo);
  // Metering must never take the product down — fail open on a read error.
  if (error) {
    console.error('usage read failed', error);
    return null;
  }

  const rows = recent ?? [];
  const inBurst = rows.filter((r) => r.created_at >= tenMinAgo).length;
  const limits = LIMITS[kind];
  let exceeded = rows.length >= limits.perDay() || inBurst >= limits.burst();
  if (kind === 'transcription') {
    const minutes = rows.reduce((sum, r) => sum + Number(r.audio_seconds ?? 0), 0) / 60;
    exceeded ||= minutes >= LIMITS.transcription.audioMinutesPerDay();
  }
  if (exceeded) {
    console.warn('fair-use limit reached', { userId, kind, day: rows.length, burst: inBurst });
    return json({ error: 'Fair-use limit reached. Take a breather and try again a bit later.', code: 'fair_use' }, 429);
  }
  return null;
}

export async function recordUsage(
  admin: SupabaseClient,
  userId: string,
  kind: UsageKind,
  details: { audioSeconds?: number; inputTokens?: number; outputTokens?: number } = {},
) {
  const { error } = await admin.from('usage_events').insert({
    user_id: userId,
    kind,
    audio_seconds: details.audioSeconds ?? null,
    input_tokens: details.inputTokens ?? null,
    output_tokens: details.outputTokens ?? null,
  });
  if (error) console.error('usage insert failed', error);
}
