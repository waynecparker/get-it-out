import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MicGlyph } from '@/components/mic-glyph';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  MOCK_FOLLOWUPS,
  MOCK_INITIAL_REPLIES,
  MOCK_TRANSCRIPTS,
  RESPONSE_MODE_LABELS,
  pickRandom,
} from '@/constants/mock-conversation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConversations } from '@/state/conversations-context';
import { Conversation, Message, ResponseMode } from '@/types/conversation';

type Status = 'idle' | 'recording' | 'paused' | 'transcribing' | 'reviewing' | 'responded';

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(text: string) {
  const trimmed = text.trim();
  const short = trimmed.length > 42 ? `${trimmed.slice(0, 42).trimEnd()}…` : trimmed;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export default function TalkScreen() {
  const theme = useTheme();
  const { addConversation } = useConversations();

  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [hasChosenMode, setHasChosenMode] = useState(false);

  const [pulse] = useState(() => new Animated.Value(1));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'recording') {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'recording') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  function startRecording() {
    setSeconds(0);
    setStatus('recording');
  }

  function pauseRecording() {
    setStatus('paused');
  }

  function resumeRecording() {
    setStatus('recording');
  }

  function cancelRecording() {
    setStatus('idle');
    setSeconds(0);
  }

  function finishRecording() {
    setStatus('transcribing');
    setTimeout(() => {
      setTranscript(pickRandom(MOCK_TRANSCRIPTS));
      setStatus('reviewing');
    }, 700);
  }

  function discardReview() {
    setStatus('idle');
    setSeconds(0);
    setTranscript('');
  }

  function submitTranscript() {
    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content: transcript,
      createdAt: new Date().toISOString(),
    };
    setMessages([userMessage]);
    setStatus('responded');
    setTimeout(() => {
      const reply: Message = {
        id: makeId(),
        role: 'assistant',
        content: pickRandom(MOCK_INITIAL_REPLIES),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 500);
  }

  function chooseMode(mode: ResponseMode) {
    setHasChosenMode(true);
    setTimeout(() => {
      const reply: Message = {
        id: makeId(),
        role: 'assistant',
        content: MOCK_FOLLOWUPS[mode],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 400);
  }

  function sendTyped() {
    if (!typedInput.trim()) return;
    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content: typedInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTypedInput('');
    setTimeout(() => {
      const reply: Message = {
        id: makeId(),
        role: 'assistant',
        content: pickRandom(MOCK_INITIAL_REPLIES),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 500);
  }

  function saveAndReset() {
    const firstUserMessage = messages.find((m) => m.role === 'user');
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: makeId(),
      title: firstUserMessage ? deriveTitle(firstUserMessage.content) : 'Untitled session',
      createdAt: messages[0]?.createdAt ?? now,
      lastMessageAt: now,
      isPinned: false,
      hasAudio: true,
      messages,
    };
    addConversation(conversation);
    setStatus('idle');
    setSeconds(0);
    setTranscript('');
    setMessages([]);
    setHasChosenMode(false);
    router.push('/history');
  }

  if (status === 'reviewing' || status === 'transcribing') {
    return (
      <Screen>
        <ThemedText type="subtitle" style={styles.reviewTitle}>
          {status === 'transcribing' ? 'Transcribing…' : "Here's what we caught"}
        </ThemedText>
        {status === 'transcribing' ? (
          <ThemedText themeColor="textSecondary">One sec.</ThemedText>
        ) : (
          <>
            <ThemedText themeColor="textSecondary" style={styles.reviewHint}>
              Fix anything that&apos;s off, then continue.
            </ThemedText>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              multiline
              style={[
                styles.transcriptInput,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
            />
            <View style={styles.reviewActions}>
              <Button variant="secondary" onPress={discardReview} style={styles.flexButton}>
                Discard
              </Button>
              <Button onPress={submitTranscript} style={styles.flexButton}>
                Looks good
              </Button>
            </View>
          </>
        )}
      </Screen>
    );
  }

  if (status === 'responded') {
    const lastMessage = messages[messages.length - 1];
    const showChoices = lastMessage?.role === 'assistant' && !hasChosenMode;

    return (
      <Screen noPadding>
        <ScrollView contentContainerStyle={styles.chatContent}>
          {messages.map((message) => (
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
            </View>
          ))}

          {showChoices && (
            <View style={styles.choices}>
              {(Object.keys(RESPONSE_MODE_LABELS) as ResponseMode[]).map((mode) => (
                <Button key={mode} variant="secondary" onPress={() => chooseMode(mode)}>
                  {RESPONSE_MODE_LABELS[mode]}
                </Button>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.composer, { borderTopColor: theme.border }]}>
          <TextInput
            value={typedInput}
            onChangeText={setTypedInput}
            placeholder="Or type instead…"
            placeholderTextColor={theme.textMuted}
            style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            onSubmitEditing={sendTyped}
          />
          <Button onPress={sendTyped} style={styles.sendButton}>
            Send
          </Button>
        </View>
        <View style={styles.doneRow}>
          <Button variant="ghost" onPress={saveAndReset}>
            Done — save to History
          </Button>
        </View>
      </Screen>
    );
  }

  const isRecordingOrPaused = status === 'recording' || status === 'paused';

  return (
    <Screen>
      <View style={styles.talkContent}>
        {isRecordingOrPaused && (
          <ThemedText type="title" style={styles.timer}>
            {formatDuration(seconds)}
          </ThemedText>
        )}

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={() => {
              if (status === 'idle') startRecording();
              else if (status === 'paused') resumeRecording();
              else finishRecording();
            }}
            style={[styles.micButton, { backgroundColor: theme.accent }]}
          >
            <MicGlyph
              mode={status === 'recording' ? 'recording' : status === 'paused' ? 'paused' : 'idle'}
              color="#14161A"
              size={64}
            />
          </Pressable>
        </Animated.View>

        <ThemedText themeColor="textSecondary" style={styles.talkHint}>
          {status === 'idle' && "Tap to talk. Say what's on your mind."}
          {status === 'recording' && 'Tap the button to finish.'}
          {status === 'paused' && 'Tap to resume.'}
        </ThemedText>

        {isRecordingOrPaused && (
          <View style={styles.recordingActions}>
            <Button variant="secondary" onPress={cancelRecording} style={styles.flexButton}>
              Cancel
            </Button>
            {status === 'recording' ? (
              <Button variant="secondary" onPress={pauseRecording} style={styles.flexButton}>
                Pause
              </Button>
            ) : (
              <Button variant="secondary" onPress={finishRecording} style={styles.flexButton}>
                Finish
              </Button>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  talkContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  timer: {
    fontVariant: ['tabular-nums'],
  },
  micButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  talkHint: {
    fontSize: 16,
    textAlign: 'center',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  flexButton: {
    flex: 1,
  },
  reviewTitle: {
    marginTop: Spacing.five,
  },
  reviewHint: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  transcriptInput: {
    minHeight: 140,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  chatContent: {
    padding: Spacing.four,
    gap: Spacing.three,
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
  choices: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: Spacing.three,
  },
  doneRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
