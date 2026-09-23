// Receives raw audio bytes (the request body itself, not JSON) and returns
// { text: string } via OpenAI Whisper. The client sends the ArrayBuffer it
// already read from the local recording — see
// src/services/supabase-transcription-provider.ts.
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const audioBuffer = await req.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'No audio received.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Server not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/m4a' }), 'recording.m4a');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'en');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: whisperForm,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper request failed', whisperResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Transcription failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await whisperResponse.json();
    return new Response(JSON.stringify({ text: result.text ?? '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('transcribe function error', error);
    return new Response(JSON.stringify({ error: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
