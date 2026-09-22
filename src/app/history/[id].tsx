import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AudioPlayButton } from '@/components/audio-play-button';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConversations } from '@/state/conversations-context';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { conversations, togglePin, deleteConversation } = useConversations();

  const conversation = conversations.find((c) => c.id === id);
  const recordingCount = conversation?.messages.filter((m) => m.audioUri).length ?? 0;

  if (!conversation) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary" style={styles.missing}>
          This conversation isn&apos;t here anymore.
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{conversation.title}</ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.meta}>
          {formatDateTime(conversation.createdAt)}
          {recordingCount > 0
            ? ` · ${recordingCount} recording${recordingCount > 1 ? 's' : ''}`
            : ' · transcript only'}
        </ThemedText>

        <View style={styles.messages}>
          {conversation.messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.role === 'user'
                  ? [styles.bubbleUser, { backgroundColor: theme.accent }]
                  : [styles.bubbleAssistant, { backgroundColor: theme.backgroundElement }],
              ]}
            >
              <ThemedText style={message.role === 'user' ? styles.bubbleUserText : undefined}>
                {message.content}
              </ThemedText>
              {message.audioUri && (
                <View style={styles.bubbleAudio}>
                  <AudioPlayButton uri={message.audioUri} tint="#14161A" />
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button variant="secondary" onPress={() => togglePin(conversation.id)} style={styles.flexButton}>
            {conversation.isPinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              deleteConversation(conversation.id);
              router.back();
            }}
            style={styles.flexButton}
          >
            Delete
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  meta: {
    marginTop: -Spacing.two,
  },
  bubbleAudio: {
    marginTop: Spacing.two,
  },
  messages: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  bubble: {
    maxWidth: '86%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.one,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Spacing.one,
  },
  bubbleUserText: {
    color: '#14161A',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  flexButton: {
    flex: 1,
  },
  missing: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
