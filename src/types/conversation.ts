export type ResponseMode = 'vent' | 'unpack' | 'action';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  responseMode?: ResponseMode;
  // Each user message can carry its own recording — a follow-up must never
  // overwrite an earlier one, so audio lives per-message, not per-conversation.
  audioUri?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  isPinned: boolean;
  messages: Message[];
}

export type StoragePreference = 'save_audio_and_transcript' | 'transcript_only' | 'delete_after_session';
