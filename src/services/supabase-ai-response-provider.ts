import { supabase } from '@/lib/supabase';
import { AIReply, AIResponseContext, AIResponseProvider } from '@/types/providers';

async function invokeAIResponse(context: AIResponseContext): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-response', {
    body: {
      transcript: context.transcript,
      history: context.history.map((m) => ({ role: m.role, content: m.content })),
      responseMode: context.responseMode,
    },
  });

  if (error) throw error;
  return (data as { content?: string })?.content ?? '';
}

export const supabaseAIResponseProvider: AIResponseProvider = {
  async generateReply(context: AIResponseContext): Promise<AIReply> {
    let content = await invokeAIResponse(context);
    if (!content.trim()) {
      // The API can occasionally come back with no usable text — one
      // silent retry before surfacing anything to the user.
      content = await invokeAIResponse(context);
    }
    if (!content.trim()) {
      throw new Error('The AI returned an empty reply.');
    }
    return { content };
  },
};
