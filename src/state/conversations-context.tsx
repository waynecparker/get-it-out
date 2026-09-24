import { File } from 'expo-file-system';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth-context';
import { usePreferences } from '@/state/preferences-context';
import { Conversation, Message } from '@/types/conversation';

const AUDIO_BUCKET = 'audio-recordings';
const UNDO_WINDOW_MS = 5000;

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
  triggered_safety_panel: boolean;
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
  /** Optimistically hides the conversation and starts a ~5s undo window before permanently deleting it. */
  requestDelete: (id: string) => void;
  /** Restores a conversation removed by requestDelete, if the undo window hasn't closed yet. */
  undoDelete: () => void;
  pendingDeletionTitle: string | null;
  deleteAllHistory: () => Promise<{ error: string | null }>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { storagePreference } = usePreferences();
  const [rawConversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeletion, setPendingDeletion] = useState<Conversation | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
         messages ( id, role, content, response_mode, created_at, triggered_safety_panel,
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
        triggeredSafetyPanel: m.triggered_safety_panel,
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
            triggered_safety_panel: message.triggeredSafetyPanel ?? false,
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

  // Actually removes a conversation's DB rows and Storage objects. Called
  // only once the undo window has closed. On failure, the conversation is
  // restored to the visible list rather than silently vanishing.
  const commitDelete = useCallback(async (conversation: Conversation) => {
    try {
      const { data: messageRows, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversation.id);
      if (messagesError) throw messagesError;
      const messageIds = (messageRows ?? []).map((m) => m.id);

      if (messageIds.length > 0) {
        const { data: recordings, error: recordingsError } = await supabase
          .from('audio_recordings')
          .select('storage_path')
          .in('message_id', messageIds);
        if (recordingsError) throw recordingsError;
        const paths = (recordings ?? []).map((r) => r.storage_path);
        if (paths.length > 0) {
          const { error: removeError } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
          if (removeError) throw removeError;
        }
      }

      const { error: deleteError } = await supabase.from('conversations').delete().eq('id', conversation.id);
      if (deleteError) throw deleteError;
    } catch {
      // Restore it — never claim something was deleted when it wasn't.
      setConversations((prev) => [conversation, ...prev]);
      Alert.alert(
        "Couldn't delete that conversation",
        'Something went wrong — it has been restored. Check your connection and try again.',
      );
    }
  }, []);

  const requestDelete = useCallback(
    (id: string) => {
      const target = conversations.find((c) => c.id === id);
      if (!target) return;

      // Only one pending deletion's undo window is tracked at a time — if
      // another was already waiting, let it commit immediately rather than
      // silently dropping it.
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      setPendingDeletion((previous) => {
        if (previous) commitDelete(previous);
        return target;
      });

      setConversations((prev) => prev.filter((c) => c.id !== id));
      pendingTimeoutRef.current = setTimeout(() => {
        pendingTimeoutRef.current = null;
        setPendingDeletion(null);
        commitDelete(target);
      }, UNDO_WINDOW_MS);
    },
    [conversations, commitDelete],
  );

  const undoDelete = useCallback(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    setPendingDeletion((previous) => {
      if (previous) {
        setConversations((prev) => [previous, ...prev]);
      }
      return null;
    });
  }, []);

  const deleteAllHistory = useCallback(async (): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not signed in.' };
    const userId = session.user.id;
    try {
      const { data: recordings, error: recordingsError } = await supabase
        .from('audio_recordings')
        .select('storage_path')
        .eq('user_id', userId);
      if (recordingsError) throw recordingsError;
      const paths = (recordings ?? []).map((r) => r.storage_path);
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
        if (removeError) throw removeError;
      }

      const { error: deleteError } = await supabase.from('conversations').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;

      setConversations([]);
      return { error: null };
    } catch {
      return { error: "Something went wrong deleting your history. Nothing was removed — try again." };
    }
  }, [session]);

  const value = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      isLoading,
      addConversation,
      togglePin,
      requestDelete,
      undoDelete,
      pendingDeletionTitle: pendingDeletion?.title ?? null,
      deleteAllHistory,
    }),
    [conversations, isLoading, addConversation, togglePin, requestDelete, undoDelete, pendingDeletion, deleteAllHistory],
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
