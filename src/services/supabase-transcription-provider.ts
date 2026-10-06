import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import { toServiceError } from '@/services/service-error';
import { TranscriptionProvider } from '@/types/providers';

export const supabaseTranscriptionProvider: TranscriptionProvider = {
  async transcribe(audioUri: string) {
    const file = new File(audioUri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.functions.invoke('transcribe', {
      body: arrayBuffer,
      headers: { 'Content-Type': 'audio/m4a' },
    });

    if (error) throw await toServiceError(error);
    return (data as { text?: string })?.text ?? '';
  },
};
