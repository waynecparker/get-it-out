import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Stage = 'verifying' | 'ready' | 'submitting' | 'failed';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string; code?: string }>();

  const [stage, setStage] = useState<Stage>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function verifyLink() {
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        setStage(error ? 'failed' : 'ready');
        if (error) setError(error.message);
        return;
      }
      if (params.token_hash && params.type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: params.token_hash,
        });
        setStage(error ? 'failed' : 'ready');
        if (error) setError(error.message);
        return;
      }
      setError('This reset link is missing or invalid.');
      setStage('failed');
    }
    verifyLink();
  }, [params.code, params.token_hash, params.type]);

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setStage('submitting');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setStage('ready');
      return;
    }
    router.replace('/(tabs)');
  }

  if (stage === 'verifying') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Verifying your reset link…</ThemedText>
      </Screen>
    );
  }

  if (stage === 'failed') {
    return (
      <Screen>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Link didn&apos;t work
          </ThemedText>
          <ThemedText type="small" style={[styles.message, { color: theme.safety }]}>
            {error ?? 'This reset link is invalid or has expired.'}
          </ThemedText>
          <Button onPress={() => router.replace('/auth')}>Back to log in</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Set a new password
        </ThemedText>

        <View style={styles.fields}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password (min 6 characters)"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
        </View>

        {error && (
          <ThemedText type="small" style={[styles.message, { color: theme.safety }]}>
            {error}
          </ThemedText>
        )}

        <Button onPress={handleSubmit} disabled={stage === 'submitting'}>
          {stage === 'submitting' ? 'Saving…' : 'Save new password'}
        </Button>
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
  message: {
    marginBottom: Spacing.one,
  },
});
