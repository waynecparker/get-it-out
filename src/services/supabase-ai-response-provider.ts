import { supabase } from '@/lib/supabase';
import { AIReply, AIResponseContext, AIResponseProvider, SafetyRiskLevel, SafetyRiskType } from '@/types/providers';

interface RawResponse {
  content?: string;
  riskLevel?: SafetyRiskLevel;
  riskType?: SafetyRiskType;
  crisisResolved?: boolean;
  awaitingMeansCheck?: boolean;
}

async function invokeAIResponse(context: AIResponseContext): Promise<AIReply> {
  const { data, error } = await supabase.functions.invoke('ai-response', {
    body: {
      transcript: context.transcript,
      history: context.history.map((m) => ({ role: m.role, content: m.content })),
      responseMode: context.responseMode,
      crisisModeActive: context.crisisModeActive,
    },
  });

  if (error) throw error;
  const raw = data as RawResponse;
  const riskLevel: SafetyRiskLevel =
    raw?.riskLevel === 'concerning' || raw?.riskLevel === 'immediate' ? raw.riskLevel : 'none';
  return {
    content: raw?.content ?? '',
    riskLevel,
    riskType: riskLevel !== 'none' ? raw?.riskType : undefined,
    crisisResolved: context.crisisModeActive ? raw?.crisisResolved === true : undefined,
    awaitingMeansCheck: raw?.awaitingMeansCheck === true,
  };
}

export const supabaseAIResponseProvider: AIResponseProvider = {
  async generateReply(context: AIResponseContext): Promise<AIReply> {
    let reply = await invokeAIResponse(context);
    if (!reply.content.trim()) {
      // The API can occasionally come back with no usable text — one
      // silent retry before surfacing anything to the user.
      reply = await invokeAIResponse(context);
    }
    if (!reply.content.trim()) {
      throw new Error('The AI returned an empty reply.');
    }
    return reply;
  },
};
