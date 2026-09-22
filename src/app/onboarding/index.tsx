import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/state/preferences-context';
import { StoragePreference } from '@/types/conversation';

interface Slide {
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    title: 'Get it out',
    body: "This is a private place to say the raw stuff out loud. Not therapy, not counselling — just somewhere to talk when you don't want to talk to anyone.",
  },
  {
    title: 'It listens first',
    body: 'Press the button and say whatever\'s on your mind. An AI transcribes and replies — but it lets you vent before it does anything else.',
  },
  {
    title: 'Know the limits',
    body: "It's private, but it isn't therapy and it isn't emergency support. If you're in immediate danger, it'll point you to real help — Triple Zero, Lifeline, someone nearby.",
  },
  {
    title: 'Your recordings, your call',
    body: 'You choose what gets kept: the audio and transcript, just the transcript, or nothing at all after the session ends. Change it anytime in Settings.',
  },
];

const STORAGE_OPTIONS: { value: StoragePreference; label: string; hint: string }[] = [
  {
    value: 'save_audio_and_transcript',
    label: 'Save audio and transcript',
    hint: 'Keep the recording and the text so you can listen back later.',
  },
  {
    value: 'transcript_only',
    label: 'Transcript only',
    hint: 'Keep the text, delete the audio once it\'s transcribed.',
  },
  {
    value: 'delete_after_session',
    label: 'Delete everything after each session',
    hint: 'Nothing is kept once you close the conversation.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { storagePreference, setStoragePreference, completeOnboarding } = usePreferences();
  const [step, setStep] = useState(0);

  const totalSteps = SLIDES.length + 1;
  const isLastStep = step === totalSteps - 1;

  function goNext() {
    if (isLastStep) {
      completeOnboarding();
      router.replace('/(tabs)');
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <Screen>
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === step ? theme.accent : theme.backgroundElement },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        {step < SLIDES.length ? (
          <>
            <ThemedText type="title" style={styles.title}>
              {SLIDES[step].title}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {SLIDES[step].body}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="title" style={styles.title}>
              How should we handle recordings?
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              You can change this later in Settings.
            </ThemedText>
            <View style={styles.options}>
              {STORAGE_OPTIONS.map((option) => {
                const selected = storagePreference === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setStoragePreference(option.value)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        { borderColor: selected ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {selected && <View style={[styles.radioFill, { backgroundColor: theme.accent }]} />}
                    </View>
                    <View style={styles.optionText}>
                      <ThemedText type="smallBold">{option.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {option.hint}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        {step > 0 && (
          <Button variant="ghost" onPress={goBack} style={styles.backButton}>
            Back
          </Button>
        )}
        <Button onPress={goNext} style={styles.nextButton}>
          {isLastStep ? 'Get started' : 'Next'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  body: {
    fontSize: 17,
    lineHeight: 25,
  },
  options: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
