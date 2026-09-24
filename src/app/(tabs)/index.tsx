import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AudioPlayButton } from '@/components/audio-play-button';
import { Button } from '@/components/button';
import { MicGlyph } from '@/components/mic-glyph';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { RESPONSE_MODE_LABELS } from '@/constants/response-modes';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { aiResponseProvider, transcriptionProvider } from '@/services/providers';
import { useConversations } from '@/state/conversations-context';
import { usePreferences } from '@/state/preferences-context';
import { Conversation, Message, ResponseMode } from '@/types/conversation';
import { AIResponseContext } from '@/types/providers';

type Phase = 'idle' | 'recording' | 'paused' | 'transcribing' | 'reviewing' | 'responded';

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
  const { storagePreference } = usePreferences();
  const recorder = useVoiceRecorder();
  const [isSaving, setIsSaving] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [chosenMode, setChosenMode] = useState<ResponseMode | null>(null);
  const [pendingReplyContext, setPendingReplyContext] = useState<AIResponseContext | null>(null);

  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (phase !== 'recording') {
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
  }, [phase, pulse]);

  async function startRecording() {
    const started = await recorder.start();
    if (!started) return;
    setPhase('recording');
  }

  function pauseRecording() {
    recorder.pause();
    setPhase('paused');
  }

  function resumeRecording() {
    recorder.resume();
    setPhase('recording');
  }

  const backPhase = messages.length > 0 ? 'responded' : 'idle';

  async function cancelRecording() {
    await recorder.cancel();
    setAudioUri(null);
    setPhase(backPhase);
  }

  async function finishRecording() {
    setPhase('transcribing');
    const uri = await recorder.finish();
    setAudioUri(uri);
    if (!uri) {
      setPhase(backPhase);
      return;
    }
    try {
      const text = await transcriptionProvider.transcribe(uri);
      setTranscript(text);
      setPhase('reviewing');
    } catch {
      recorder.discard(uri);
      setAudioUri(null);
      Alert.alert('Transcription failed', "Couldn't transcribe that recording — give it another go.");
      setPhase(backPhase);
    }
  }

  function discardReview() {
    recorder.discard(audioUri);
    setAudioUri(null);
    setTranscript('');
    setPhase(backPhase);
  }

  // Shared by every path that asks for a reply. The provider already
  // retries once internally on an empty response; if it still fails, the
  // user's message stays exactly where it is and a tappable retry shows
  // in its place — never an empty or missing assistant bubble.
  async function requestReply(context: AIResponseContext) {
    setPendingReplyContext(null);
    try {
      const reply = await aiResponseProvider.generateReply(context);
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', content: reply.content, createdAt: new Date().toISOString() },
      ]);
    } catch {
      setPendingReplyContext(context);
    }
  }

  function retryReply() {
    if (pendingReplyContext) requestReply(pendingReplyContext);
  }

  async function submitTranscript() {
    const isFollowUp = messages.length > 0;
    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content: transcript,
      createdAt: new Date().toISOString(),
      audioUri: audioUri ?? undefined,
    };
    const history = messages;
    setMessages((prev) => (isFollowUp ? [...prev, userMessage] : [userMessage]));
    setAudioUri(null);
    setPhase('responded');
    await requestReply({
      transcript,
      history: isFollowUp ? history : [],
      // Once a mode is chosen, every further "Keep talking" round stays
      // in that mode too — not just the reply right after the tap.
      responseMode: isFollowUp ? (chosenMode ?? undefined) : undefined,
    });
  }

  async function chooseMode(mode: ResponseMode) {
    setChosenMode(mode);
    await requestReply({
      // The button tap itself is the new turn — the message it responds
      // to is already the last entry in history, so it isn't repeated.
      transcript: `(The user tapped "${RESPONSE_MODE_LABELS[mode]}".)`,
      history: messages,
      responseMode: mode,
    });
  }

  async function sendTyped() {
    const text = typedInput.trim();
    if (!text) return;
    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTypedInput('');
    await requestReply({ transcript: text, history: messages });
  }

  async function saveAndReset() {
    const firstUserMessage = messages.find((m) => m.role === 'user');
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: makeId(),
      title: firstUserMessage ? deriveTitle(firstUserMessage.content) : 'Untitled session',
      createdAt: messages[0]?.createdAt ?? now,
      lastMessageAt: now,
      isPinned: false,
      messages,
    };
    setIsSaving(true);
    const result = await addConversation(conversation);
    setIsSaving(false);
    setPhase('idle');
    setAudioUri(null);
    setTranscript('');
    setMessages([]);
    setChosenMode(null);
    setPendingReplyContext(null);
    if (result.audioUploadFailed) {
      Alert.alert(
        'Recording not saved',
        "Your conversation was saved, but one or more recordings couldn't be uploaded. The transcript is still there.",
      );
    }
    if (storagePreference !== 'delete_after_session') {
      router.push('/history');
    }
  }

  if (phase === 'reviewing' || phase === 'transcribing') {
    return (
      <Screen>
        <ThemedText type="subtitle" style={styles.reviewTitle}>
          {phase === 'transcribing' ? 'Transcribing…' : "Here's what we caught"}
        </ThemedText>
        {phase === 'transcribing' ? (
          <ThemedText themeColor="textSecondary">One sec.</ThemedText>
        ) : (
          <>
            <ThemedText themeColor="textSecondary" style={styles.reviewHint}>
              Fix anything that&apos;s off, then continue.
            </ThemedText>
            {audioUri && (
              <View style={styles.playbackRow}>
                <AudioPlayButton uri={audioUri} />
              </View>
            )}
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
                Yep, that&apos;s it
              </Button>
            </View>
          </>
        )}
      </Screen>
    );
  }

  if (phase === 'responded') {
    const lastMessage = messages[messages.length - 1];
    const showChoices = lastMessage?.role === 'assistant' && chosenMode === null;
    const isVentMode = chosenMode === 'vent';

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
              {message.audioUri && (
                <View style={styles.bubbleAudio}>
                  <AudioPlayButton uri={message.audioUri} tint="#14161A" />
                </View>
              )}
            </View>
          ))}

          {pendingReplyContext && (
            <Pressable
              onPress={retryReply}
              style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText style={{ color: theme.safety }}>⚠ Couldn&apos;t get a reply — Try response again</ThemedText>
            </Pressable>
          )}

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

        {isVentMode ? (
          <View style={[styles.ventActions, { borderTopColor: theme.border }]}>
            <Button variant="secondary" onPress={saveAndReset} style={styles.flexButton} disabled={isSaving}>
              {isSaving
                ? 'Saving…'
                : storagePreference === 'delete_after_session'
                  ? 'Save (nothing will be kept)'
                  : 'Save to history'}
            </Button>
            <Button onPress={startRecording} style={styles.flexButton} disabled={isSaving}>
              Keep talking
            </Button>
          </View>
        ) : (
          <>
            <View style={[styles.composer, { borderTopColor: theme.border }]}>
              <TextInput
                value={typedInput}
                onChangeText={setTypedInput}
                placeholder="Or type instead…"
                placeholderTextColor={theme.textMuted}
                style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                onSubmitEditing={sendTyped}
              />
              <Pressable
                onPress={startRecording}
                style={[styles.composerMicButton, { backgroundColor: theme.accent }]}
              >
                <Ionicons name="mic" size={20} color="#14161A" />
              </Pressable>
              <Button onPress={sendTyped} style={styles.sendButton}>
                Send
              </Button>
            </View>
            <View style={styles.doneRow}>
              <Button variant="ghost" onPress={saveAndReset} disabled={isSaving}>
                {isSaving
                  ? 'Saving…'
                  : storagePreference === 'delete_after_session'
                    ? 'Done — nothing will be kept'
                    : 'Done — save to History'}
              </Button>
            </View>
          </>
        )}
      </Screen>
    );
  }

  const isRecordingOrPaused = phase === 'recording' || phase === 'paused';

  return (
    <Screen>
      <View style={styles.talkContent}>
        {isRecordingOrPaused && (
          <ThemedText type="title" style={styles.timer}>
            {formatDuration(Math.floor(recorder.durationMillis / 1000))}
          </ThemedText>
        )}

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={() => {
              if (phase === 'idle') startRecording();
              else if (phase === 'paused') resumeRecording();
              else finishRecording();
            }}
            style={[styles.micButton, { backgroundColor: theme.accent }]}
          >
            <MicGlyph
              mode={phase === 'recording' ? 'recording' : phase === 'paused' ? 'paused' : 'idle'}
              color="#14161A"
              size={64}
            />
          </Pressable>
        </Animated.View>

        <ThemedText themeColor="textSecondary" style={styles.talkHint}>
          {recorder.permissionDenied
            ? "Microphone access is off. Enable it in your phone's settings to record."
            : null}
          {!recorder.permissionDenied && phase === 'idle' && "Tap to talk. Say what's on your mind."}
          {!recorder.permissionDenied && phase === 'recording' && 'Tap the button to finish.'}
          {!recorder.permissionDenied && phase === 'paused' && 'Tap to resume.'}
        </ThemedText>

        {isRecordingOrPaused && (
          <View style={styles.recordingActions}>
            <Button variant="secondary" onPress={cancelRecording} style={styles.flexButton}>
              Cancel
            </Button>
            {phase === 'recording' ? (
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
    marginBottom: Spacing.three,
  },
  playbackRow: {
    marginBottom: Spacing.three,
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
  bubbleAudio: {
    marginTop: Spacing.two,
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
  ventActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
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
  composerMicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
