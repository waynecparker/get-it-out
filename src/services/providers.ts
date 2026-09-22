import { mockAIResponseProvider } from '@/services/mock-ai-response-provider';
import { mockTranscriptionProvider } from '@/services/mock-transcription-provider';

// The single swap point for Checkpoint 4: replace these two exports with
// Supabase Edge Function-backed implementations of the same interfaces
// (src/types/providers.ts) and nothing else in the app needs to change.
export const transcriptionProvider = mockTranscriptionProvider;
export const aiResponseProvider = mockAIResponseProvider;
