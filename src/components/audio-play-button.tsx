import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const AUDIO_BUCKET = 'audio-recordings';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface AudioPlayButtonProps {
  /** A directly-playable URI — a local file:// recording not yet saved. */
  uri?: string;
  /** A durable Supabase Storage path — resolved to a signed URL on demand. */
  storagePath?: string;
  /** Override for use on a tinted background (e.g. the accent-coloured user bubble). */
  tint?: string;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayButton({ uri, storagePath, tint }: AudioPlayButtonProps) {
  const theme = useTheme();
  const [resolvedUri, setResolvedUri] = useState<string | undefined>(uri);
  const [isResolving, setIsResolving] = useState(!uri && Boolean(storagePath));
  const [error, setError] = useState<string | null>(null);
  const hasAutoRetried = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Pure fetch — no setState here, so callers decide how to apply the
  // result. Keeps the mount effect's setState calls inside a .then()
  // callback rather than a synchronously-invoked function.
  const fetchSignedUrl = useCallback(async (): Promise<string | null> => {
    if (!storagePath) return null;
    const { data, error: signError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signError || !data?.signedUrl) return null;
    return data.signedUrl;
  }, [storagePath]);

  useEffect(() => {
    if (uri || !storagePath) return;
    let cancelled = false;
    fetchSignedUrl().then((url) => {
      if (cancelled) return;
      if (url) {
        hasAutoRetried.current = false;
        setResolvedUri(url);
        setError(null);
      } else {
        setError("Couldn't load this recording — tap to retry");
      }
      setIsResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uri, storagePath, fetchSignedUrl]);

  function retry() {
    if (!storagePath) {
      setError(null);
      return;
    }
    hasAutoRetried.current = false;
    setIsResolving(true);
    setError(null);
    fetchSignedUrl().then((url) => {
      setIsResolving(false);
      if (url) {
        setResolvedUri(url);
      } else {
        setError("Couldn't load this recording — tap to retry");
      }
    });
  }

  function handlePlaybackError() {
    if (storagePath && !hasAutoRetried.current) {
      // Most likely an expired signed URL — fetch a fresh one once, silently.
      hasAutoRetried.current = true;
      retry();
      return;
    }
    setError('This recording could not be played — tap to retry');
  }

  const tintStyle = tint ? { color: tint } : undefined;

  if (error) {
    return (
      <Pressable onPress={retry} style={styles.row}>
        <ThemedText type="smallBold" style={tintStyle ?? { color: theme.safety }}>
          ⚠ {error}
        </ThemedText>
      </Pressable>
    );
  }

  if (isResolving || !resolvedUri) {
    return (
      <ThemedText type="small" themeColor="textMuted" style={tintStyle}>
        Loading recording…
      </ThemedText>
    );
  }

  return <PlayerControls key={resolvedUri} uri={resolvedUri} tint={tint} onError={handlePlaybackError} />;
}

interface PlayerControlsProps {
  uri: string;
  tint?: string;
  onError: () => void;
}

function PlayerControls({ uri, tint, onError }: PlayerControlsProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (status.error) onErrorRef.current();
  }, [status.error]);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration) {
      player.seekTo(0);
    }
    player.play();
  }

  return (
    <Pressable onPress={toggle} style={styles.row}>
      <ThemedText themeColor={tint ? undefined : 'accent'} style={tint ? { color: tint } : undefined} type="smallBold">
        {status.playing ? '⏸ Pause' : '▶ Play recording'}
      </ThemedText>
      {status.duration > 0 && (
        <ThemedText type="small" themeColor="textMuted" style={tint ? { color: tint, opacity: 0.8 } : undefined}>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
