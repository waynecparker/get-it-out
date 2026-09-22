import { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface ScreenProps extends PropsWithChildren {
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Screen({ children, style, noPadding }: ScreenProps) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={[styles.fill, !noPadding && styles.padded, style]}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.four,
  },
});
