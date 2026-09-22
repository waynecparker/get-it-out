import { Message, ResponseMode } from '@/types/conversation';

export interface TranscriptionProvider {
  transcribe(audioUri: string): Promise<string>;
}

export interface AIResponseContext {
  transcript: string;
  history: Message[];
  responseMode?: ResponseMode;
}

export interface AIReply {
  content: string;
}

export interface AIResponseProvider {
  generateReply(context: AIResponseContext): Promise<AIReply>;
}
