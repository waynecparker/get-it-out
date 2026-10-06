// Receives raw audio bytes (the request body itself, not JSON) and returns
// { text: string } via OpenAI Whisper. The client sends the ArrayBuffer it
// already read from the local recording — see
// src/services/supabase-transcription-provider.ts.
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, checkAccess, getCaller, json, recordUsage } from '../_shared/guard.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: 'Not authenticated.' }, 401);

    const admin = adminClient();
    const denied = await checkAccess(admin, user.id, 'transcription');
    if (denied) return denied;

    const audioBuffer = await req.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return json({ error: 'No audio received.' }, 400);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return json({ error: 'Server not configured.' }, 500);
    }

    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/m4a' }), 'recording.m4a');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'en');
    // verbose_json adds the audio duration, used for usage metering only.
    whisperForm.append('response_format', 'verbose_json');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: whisperForm,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper request failed', whisperResponse.status, errorText);
      return json({ error: 'Transcription failed.' }, 502);
    }

    const result = await whisperResponse.json();
    await recordUsage(admin, user.id, 'transcription', {
      audioSeconds: typeof result.duration === 'number' ? result.duration : undefined,
    });
    return json({ text: result.text ?? '' });
  } catch (error) {
    console.error('transcribe function error', error);
    return json({ error: 'Unexpected server error.' }, 500);
  }
});
