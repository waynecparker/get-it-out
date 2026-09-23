import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth-context';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password';

export default function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';
  const isForgotPassword = mode === 'forgot-password';

  const canSubmit = isForgotPassword
    ? email.trim().length > 0 && !isSubmitting
    : email.trim().length > 0 && password.length >= 6 && (!isSignUp || ageConfirmed) && !isSubmitting;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
  }

  async function handleForgotPassword() {
    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setInfo("If that email has an account, we've sent a reset link to it.");
  }

  async function handleSubmit() {
    if (isForgotPassword) {
      await handleForgotPassword();
      return;
    }

    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const result = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (isSignUp && result.needsEmailConfirmation) {
      setInfo('Check your email to confirm your account, then log in.');
      switchMode('sign-in');
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {isForgotPassword
            ? "Enter your email and we'll send you a link to set a new password."
            : isSignUp
              ? 'Private, and only for you — no one else can see this.'
              : 'Log back in to pick up where you left off.'}
        </ThemedText>

        <View style={styles.fields}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />

          {!isForgotPassword && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
          )}

          {isSignUp && (
            <Pressable onPress={() => setAgeConfirmed((v) => !v)} style={styles.ageRow}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: ageConfirmed ? theme.accent : theme.textMuted },
                  ageConfirmed && { backgroundColor: theme.accent },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.ageLabel}>
                I confirm I&apos;m 18 or older.
              </ThemedText>
            </Pressable>
          )}
        </View>

        {error && (
          <ThemedText type="small" style={[styles.message, { color: theme.safety }]}>
            {error}
          </ThemedText>
        )}
        {info && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {info}
          </ThemedText>
        )}

        <Button onPress={handleSubmit} disabled={!canSubmit}>
          {isSubmitting
            ? 'One sec…'
            : isForgotPassword
              ? 'Send reset link'
              : isSignUp
                ? 'Create account'
                : 'Log in'}
        </Button>

        {mode === 'sign-in' && (
          <Pressable onPress={() => switchMode('forgot-password')} style={styles.toggle}>
            <ThemedText type="small" themeColor="textSecondary">
              Forgot password?
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          onPress={() => switchMode(isForgotPassword ? 'sign-in' : isSignUp ? 'sign-in' : 'sign-up')}
          style={styles.toggle}
        >
          <ThemedText type="small" themeColor="textSecondary">
            {isForgotPassword
              ? 'Back to log in'
              : isSignUp
                ? 'Already have an account? Log in'
                : "Don't have an account? Sign up"}
          </ThemedText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  fields: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
  },
  ageLabel: {
    flex: 1,
  },
  message: {
    marginBottom: Spacing.one,
  },
  toggle: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
});
