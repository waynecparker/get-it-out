import { createContext, PropsWithChildren, use, useMemo, useState } from 'react';

import { MOCK_CONVERSATIONS } from '@/constants/mock-data';
import { Conversation } from '@/types/conversation';

interface ConversationsContextValue {
  conversations: Conversation[];
  addConversation: (conversation: Conversation) => void;
  togglePin: (id: string) => void;
  deleteConversation: (id: string) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: PropsWithChildren) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  const value = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      addConversation: (conversation) => setConversations((prev) => [conversation, ...prev]),
      togglePin: (id) =>
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)),
        ),
      deleteConversation: (id) => setConversations((prev) => prev.filter((c) => c.id !== id)),
    }),
    [conversations],
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
