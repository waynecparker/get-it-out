import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ onPress, variant = 'primary', disabled, style, children }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: theme.accent },
        variant === 'secondary' && {
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
        },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <ThemedText
        type="smallBold"
        themeColor={variant === 'primary' ? undefined : 'text'}
        style={variant === 'primary' ? styles.primaryLabel : undefined}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryLabel: {
    color: '#14161A',
  },
});
