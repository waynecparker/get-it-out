import { supabase } from '@/lib/supabase';
import { AIReply, AIResponseContext, AIResponseProvider } from '@/types/providers';

export const supabaseAIResponseProvider: AIResponseProvider = {
  async generateReply(context: AIResponseContext): Promise<AIReply> {
    const { data, error } = await supabase.functions.invoke('ai-response', {
      body: {
        transcript: context.transcript,
        history: context.history.map((m) => ({ role: m.role, content: m.content })),
        responseMode: context.responseMode,
      },
    });

    if (error) throw error;
    return { content: (data as { content?: string })?.content ?? '' };
  },
};
