import { supabaseAIResponseProvider } from '@/services/supabase-ai-response-provider';
import { supabaseTranscriptionProvider } from '@/services/supabase-transcription-provider';

// Real providers, calling the transcribe / ai-response Supabase Edge
// Functions. Both implement the interfaces in src/types/providers.ts, so
// swapping providers again in future only ever means changing this file.
export const transcriptionProvider = supabaseTranscriptionProvider;
export const aiResponseProvider = supabaseAIResponseProvider;
