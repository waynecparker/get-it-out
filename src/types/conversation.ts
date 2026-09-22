export type ResponseMode = 'vent' | 'unpack' | 'action';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  responseMode?: ResponseMode;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  isPinned: boolean;
  hasAudio: boolean;
  messages: Message[];
}

export type StoragePreference = 'save_audio_and_transcript' | 'transcript_only' | 'delete_after_session';
