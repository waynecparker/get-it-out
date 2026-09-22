import { MOCK_TRANSCRIPTS, pickRandom } from '@/constants/mock-conversation';
import { TranscriptionProvider } from '@/types/providers';

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Checkpoint 4 replaces this with a Supabase Edge Function that calls a
// real transcription API (e.g. Whisper or Deepgram) — the audioUri is
// already the right shape of input for that swap.
export const mockTranscriptionProvider: TranscriptionProvider = {
  async transcribe(_audioUri: string) {
    await wait(700);
    return pickRandom(MOCK_TRANSCRIPTS);
  },
};
