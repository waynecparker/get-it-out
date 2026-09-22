import { MOCK_FOLLOWUPS, MOCK_INITIAL_REPLIES, pickRandom } from '@/constants/mock-conversation';
import { AIReply, AIResponseContext, AIResponseProvider } from '@/types/providers';

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Checkpoint 4 replaces this with a Supabase Edge Function that calls a real
// AI provider (e.g. Claude or GPT) using the system-instructions config —
// the AIResponseContext shape already carries what that call needs.
export const mockAIResponseProvider: AIResponseProvider = {
  async generateReply(context: AIResponseContext): Promise<AIReply> {
    await wait(500);
    if (context.responseMode) {
      return { content: MOCK_FOLLOWUPS[context.responseMode] };
    }
    return { content: pickRandom(MOCK_INITIAL_REPLIES) };
  },
};
