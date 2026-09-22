import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConversations } from '@/state/conversations-context';
import { Conversation } from '@/types/conversation';

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { conversations, togglePin } = useConversations();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? conversations
      : conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q)),
        );
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations, query]);

  function renderItem({ item }: { item: Conversation }) {
    const lastMessage = item.messages[item.messages.length - 1];
    const recordingCount = item.messages.filter((m) => m.audioUri).length;
    return (
      <Pressable
        onPress={() => router.push(`/history/${item.id}`)}
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <Pressable onPress={() => togglePin(item.id)} hitSlop={10}>
            <ThemedText themeColor={item.isPinned ? undefined : 'textMuted'} style={item.isPinned ? { color: theme.accent } : undefined}>
              {item.isPinned ? '★' : '☆'}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {lastMessage?.content ?? ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.cardMeta}>
          {formatDateTime(item.lastMessageAt)}
          {recordingCount > 0 ? ` · ${recordingCount} recording${recordingCount > 1 ? 's' : ''}` : ''}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle" style={styles.heading}>
        History
      </ThemedText>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your conversations"
        placeholderTextColor={theme.textMuted}
        style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {query ? 'Nothing matches that search.' : 'Nothing here yet — your sessions will show up after you talk.'}
          </ThemedText>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  cardMeta: {
    marginTop: Spacing.one,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
