// Permanently deletes the calling user's account and everything they own.
// Storage objects are removed explicitly (not tied to DB cascade); every
// owned DB row (profiles, user_preferences, conversations, messages,
// audio_recordings, subscriptions) cascades automatically once the
// auth.users row is deleted, since every one of those tables references
// auth.users(id) on delete cascade.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const AUDIO_BUCKET = 'audio-recordings';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scoped to the caller's own JWT — only ever used to confirm identity
    // and read their own rows under RLS, never to act as anyone else.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Storage isn't covered by the DB cascade — remove owned audio first.
    const { data: recordings, error: recordingsError } = await userClient
      .from('audio_recordings')
      .select('storage_path')
      .eq('user_id', user.id);

    if (recordingsError) throw recordingsError;

    const paths = (recordings ?? []).map((r) => r.storage_path);
    if (paths.length > 0) {
      const { error: removeError } = await adminClient.storage.from(AUDIO_BUCKET).remove(paths);
      // Don't abort the whole deletion over a partial storage-removal
      // hiccup — log it and continue; the account/DB deletion below is
      // the part the user is actually asking for and expects to succeed.
      if (removeError) console.error('storage removal error during account deletion', removeError);
    }

    // Remove the RevenueCat customer record too (purchase history tied to
    // this user id). Best-effort, like storage above. This does NOT cancel
    // an App Store / Google Play subscription — only the user can do that
    // in their store settings, which the app tells them before deleting.
    const revenueCatKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (revenueCatKey) {
      const rcResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${revenueCatKey}` },
      });
      if (!rcResponse.ok && rcResponse.status !== 404) {
        console.error('RevenueCat subscriber deletion failed', rcResponse.status);
      }
    }

    // Deleting the auth user cascades every owned DB row automatically.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('delete-account function error', error);
    return new Response(JSON.stringify({ error: 'Account deletion failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
