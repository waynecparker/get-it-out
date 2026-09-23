import { File } from 'expo-file-system';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth-context';
import { usePreferences } from '@/state/preferences-context';
import { Conversation, Message } from '@/types/conversation';

const AUDIO_BUCKET = 'audio-recordings';

interface AudioRecordingRow {
  id: string;
  storage_path: string;
}

interface MessageRow {
  id: string;
  role: Message['role'];
  content: string;
  response_mode: Message['responseMode'] | null;
  created_at: string;
  audio_recordings: AudioRecordingRow[];
}

interface ConversationRow {
  id: string;
  title: string | null;
  is_pinned: boolean;
  created_at: string;
  last_message_at: string;
  messages: MessageRow[];
}

function deleteLocalFileIfPresent(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup — not worth surfacing an error for a stray temp file.
  }
}

export interface SaveConversationResult {
  audioUploadFailed: boolean;
}

interface ConversationsContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  addConversation: (conversation: Conversation) => Promise<SaveConversationResult>;
  togglePin: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { storagePreference } = usePreferences();
  const [rawConversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const conversations = useMemo(
    () => (session ? rawConversations : []),
    [session, rawConversations],
  );

  // Pure fetch — returns the mapped rows without touching state. Callers
  // (the mount effect, and addConversation after a write) decide what to
  // do with the result, which keeps setState calls out of the effect body
  // itself and inside a plain callback instead.
  const fetchConversations = useCallback(async (): Promise<Conversation[] | null> => {
    if (!session) return null;

    const { data, error } = await supabase
      .from('conversations')
      .select(
        `id, title, is_pinned, created_at, last_message_at,
         messages ( id, role, content, response_mode, created_at,
           audio_recordings ( id, storage_path ) )`,
      )
      .order('last_message_at', { ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: true });

    if (error || !data) return [];

    const rows = data as unknown as ConversationRow[];

    // Carry the durable storage path, not a pre-baked signed URL — signed
    // URLs expire, and this list can stay in memory far longer than that.
    // AudioPlayButton resolves a fresh one only when it's actually shown.
    return rows.map((row) => ({
      id: row.id,
      title: row.title ?? 'Untitled session',
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      isPinned: row.is_pinned,
      messages: row.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
        responseMode: m.response_mode ?? undefined,
        audioStoragePath: m.audio_recordings[0]?.storage_path,
      })),
    }));
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    fetchConversations().then((result) => {
      if (cancelled) return;
      if (result) setConversations(result);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchConversations]);

  const addConversation = useCallback(
    async (conversation: Conversation): Promise<SaveConversationResult> => {
      if (!session) return { audioUploadFailed: false };
      const userId = session.user.id;

      if (storagePreference === 'delete_after_session') {
        // Nothing is retained — just clean up any local temp audio files.
        conversation.messages.forEach((m) => {
          if (m.audioUri) deleteLocalFileIfPresent(m.audioUri);
        });
        return { audioUploadFailed: false };
      }

      const { data: conversationRow, error: conversationError } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: conversation.title })
        .select('id')
        .single();

      if (conversationError || !conversationRow) return { audioUploadFailed: false };
      const conversationId = conversationRow.id as string;

      let audioUploadFailed = false;

      for (const message of conversation.messages) {
        const { data: messageRow, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            role: message.role,
            content: message.content,
            response_mode: message.responseMode ?? null,
          })
          .select('id')
          .single();

        if (messageError || !messageRow) continue;

        if (message.audioUri) {
          if (storagePreference === 'save_audio_and_transcript') {
            const storagePath = `${userId}/${messageRow.id}.m4a`;
            try {
              // React Native's fetch() cannot reliably read this app's own
              // local file:// URIs on Android — read it natively via File
              // instead (confirmed by diagnostic: fetch() 404s on a path
              // File reads fine).
              const localFile = new File(message.audioUri);
              const arrayBuffer = await localFile.arrayBuffer();
              if (arrayBuffer.byteLength === 0) {
                throw new Error('Recorded file was empty.');
              }
              const { error: uploadError } = await supabase.storage
                .from(AUDIO_BUCKET)
                .upload(storagePath, arrayBuffer, { contentType: 'audio/m4a', upsert: false });
              if (uploadError) throw uploadError;

              const { error: recordError } = await supabase.from('audio_recordings').insert({
                message_id: messageRow.id,
                user_id: userId,
                storage_path: storagePath,
                format: 'm4a',
              });
              if (recordError) {
                // The file uploaded but the row failed — remove the orphaned
                // file rather than leave an untracked upload behind.
                await supabase.storage.from(AUDIO_BUCKET).remove([storagePath]);
                throw recordError;
              }
            } catch {
              // No audio_recordings row was created — this message just
              // keeps its transcript, rather than pretending the save
              // fully succeeded.
              audioUploadFailed = true;
            }
          }
          deleteLocalFileIfPresent(message.audioUri);
        }
      }

      const result = await fetchConversations();
      if (result) setConversations(result);
      return { audioUploadFailed };
    },
    [session, storagePreference, fetchConversations],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const target = conversations.find((c) => c.id === id);
      if (!target) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)),
      );
      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned: !target.isPinned })
        .eq('id', id);
      if (error) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPinned: target.isPinned } : c)),
        );
      }
    },
    [conversations],
  );

  const deleteConversation = useCallback(async (id: string) => {
    const { data: messageRows } = await supabase.from('messages').select('id').eq('conversation_id', id);
    const messageIds = (messageRows ?? []).map((m) => m.id);

    if (messageIds.length > 0) {
      const { data: recordings } = await supabase
        .from('audio_recordings')
        .select('storage_path')
        .in('message_id', messageIds);
      const paths = (recordings ?? []).map((r) => r.storage_path);
      if (paths.length > 0) {
        await supabase.storage.from(AUDIO_BUCKET).remove(paths);
      }
    }

    await supabase.from('conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo<ConversationsContextValue>(
    () => ({ conversations, isLoading, addConversation, togglePin, deleteConversation }),
    [conversations, isLoading, addConversation, togglePin, deleteConversation],
  );

  return <ConversationsContext value={value}>{children}</ConversationsContext>;
}

export function useConversations() {
  const context = use(ConversationsContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
}
