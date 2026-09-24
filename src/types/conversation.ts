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
  // audioUri: a local file:// recording not yet saved (this session only).
  // audioStoragePath: the durable Supabase Storage path once saved — signed
  // URLs are resolved on demand from this, never cached, since they expire.
  audioUri?: string;
  audioStoragePath?: string;
  // Whether this assistant message triggered the safety-support panel —
  // stored so a saved, reopened conversation re-renders it correctly.
  triggeredSafetyPanel?: boolean;
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
