// Generates the AI reply. Request body: { transcript, history, responseMode? }
// matching src/types/providers.ts's AIResponseContext. Response: { content }.
import { corsHeaders } from '../_shared/cors.ts';
import { BASE_SYSTEM_PROMPT, MODE_ADDENDA } from './systemPrompt.ts';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface RequestBody {
  transcript: string;
  history?: ChatMessage[];
  responseMode?: 'vent' | 'unpack' | 'action';
}

// The Talk screen's UI can produce two assistant turns in a row (the
// initial reply, then a mode-specific follow-up) with no user message in
// between — but Claude's Messages API requires strictly alternating
// roles. Merge consecutive same-role turns before sending.
function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const normalized: ChatMessage[] = [];
  for (const message of messages) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === message.role) {
      last.content += `\n\n${message.content}`;
    } else {
      normalized.push({ role: message.role, content: message.content });
    }
  }
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { transcript, history, responseMode } = body;

    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing transcript.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Server not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = responseMode
      ? `${BASE_SYSTEM_PROMPT}\n\n## Right now\n${MODE_ADDENDA[responseMode]}`
      : BASE_SYSTEM_PROMPT;

    const messages = normalizeMessages([...(history ?? []), { role: 'user', content: transcript }]);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude request failed', claudeResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI response failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await claudeResponse.json();
    const content = result.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-response function error', error);
    return new Response(JSON.stringify({ error: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
