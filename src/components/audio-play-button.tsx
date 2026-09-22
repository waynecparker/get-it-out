import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface AudioPlayButtonProps {
  uri: string;
  /** Override for use on a tinted background (e.g. the accent-coloured user bubble). */
  tint?: string;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayButton({ uri, tint }: AudioPlayButtonProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

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
