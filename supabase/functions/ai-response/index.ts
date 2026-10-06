// Generates the AI reply plus a safety classification, in one Claude call.
// Request body: { transcript, history, responseMode?, crisisModeActive? }
// matching src/types/providers.ts's AIResponseContext. Response:
// { content, riskLevel, riskType?, crisisResolved?, awaitingMeansCheck? }.
//
// Deliberately does not record anywhere that a risk was classified — an
// unsaved conversation must leave no trace, including safety metadata.
// The classification only persists at all if the user explicitly saves
// the conversation (as messages.triggered_safety_panel). The only thing
// recorded per call is an internal usage count (tokens, timestamp) in
// usage_events, for cost tracking and fair use — never content or risk.
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, checkAccess, getCaller, json, recordUsage } from '../_shared/guard.ts';
import { BASE_SYSTEM_PROMPT, MODE_ADDENDA } from './systemPrompt.ts';

type ChatRole = 'user' | 'assistant';
type RiskLevel = 'none' | 'concerning' | 'immediate';
type RiskType = 'self_harm' | 'harm_to_others' | 'medical' | 'intoxication_risk';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface RequestBody {
  transcript: string;
  history?: ChatMessage[];
  responseMode?: 'vent' | 'unpack' | 'action' | 'stepdown';
  crisisModeActive?: boolean;
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

// Forcing a tool call is far more reliable than asking the model to emit
// parseable text — the classification is guaranteed to be one of the
// enum values rather than something we have to defensively parse.
const RESPOND_TOOL = {
  name: 'respond',
  description: "Reply to the user and classify any safety risk in their message.",
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: 'Your conversational reply to the user, following all voice and behaviour rules.',
      },
      risk_level: {
        type: 'string',
        enum: ['none', 'concerning', 'immediate'],
        description:
          'none = ordinary venting/distress/anger/swearing/figurative language. concerning = deserves gentle encouragement to reach out, not immediate danger. immediate = credible, current danger of suicide, self-harm, harming another person, or an urgent life-threatening situation.',
      },
      risk_type: {
        type: 'string',
        enum: ['self_harm', 'harm_to_others', 'medical', 'intoxication_risk'],
        description: "Only include when risk_level is 'concerning' or 'immediate'.",
      },
      crisis_resolved: {
        type: 'boolean',
        description:
          "Only include when the context says this conversation is already in crisis mode from an earlier turn. True once he's clearly confirmed safety or a real handoff to support, otherwise false.",
      },
      awaiting_means_check: {
        type: 'boolean',
        description:
          'Set true only on the exact turn where your reply itself asks the means-check yes/no question (e.g. "Have you taken any pills already?"). False or omit on every other turn, including the turn where he answers it.',
      },
    },
    required: ['reply', 'risk_level'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: 'Not authenticated.' }, 401);

    const admin = adminClient();
    const denied = await checkAccess(admin, user.id, 'ai_response');
    if (denied) return denied;

    const body: RequestBody = await req.json();
    const { transcript, history, responseMode, crisisModeActive } = body;

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

    let systemPrompt = responseMode
      ? `${BASE_SYSTEM_PROMPT}\n\n## Right now\n${MODE_ADDENDA[responseMode]}`
      : BASE_SYSTEM_PROMPT;
    if (crisisModeActive) {
      systemPrompt += '\n\n## Context\nThis conversation is already in crisis mode from an earlier turn.';
    }

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
        max_tokens: 500,
        system: systemPrompt,
        messages,
        tools: [RESPOND_TOOL],
        tool_choice: { type: 'tool', name: 'respond' },
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
    // Metering only — counts, never content.
    await recordUsage(admin, user.id, 'ai_response', {
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens,
    });
    // Other block types (e.g. "thinking") can precede the tool_use block —
    // find it by type rather than assuming position.
    const toolBlock = Array.isArray(result.content)
      ? result.content.find((block: { type: string }) => block.type === 'tool_use')
      : undefined;
    const input = (toolBlock?.input ?? {}) as {
      reply?: string;
      risk_level?: RiskLevel;
      risk_type?: RiskType;
      crisis_resolved?: boolean;
      awaiting_means_check?: boolean;
    };

    const rawReply = typeof input.reply === 'string' ? input.reply : '';
    // Defensive: the model occasionally double-escapes newlines inside the
    // JSON tool-call payload, producing the literal two characters "\" + "n"
    // instead of a real line break. Normalize before it reaches the client.
    const content = rawReply.replace(/\\n/g, '\n');
    const riskLevel: RiskLevel = input.risk_level === 'concerning' || input.risk_level === 'immediate'
      ? input.risk_level
      : 'none';
    const riskType = riskLevel !== 'none' ? input.risk_type : undefined;
    const crisisResolved = crisisModeActive ? input.crisis_resolved === true : undefined;
    const awaitingMeansCheck = input.awaiting_means_check === true;

    return new Response(JSON.stringify({ content, riskLevel, riskType, crisisResolved, awaitingMeansCheck }), {
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
