import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SAFETY_CONTACTS } from '@/constants/safety-contacts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SafetyPanel() {
  const theme = useTheme();

  function call(dialNumber: string) {
    Linking.openURL(`tel:${dialNumber}`).catch(() => {});
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.safety }]}>
      <ThemedText type="smallBold" style={styles.heading}>
        You don&apos;t have to handle this bit alone.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
        I&apos;m still here with you. But this sounds like something that needs a real person alongside you right
        now.
      </ThemedText>

      <View style={styles.contacts}>
        {SAFETY_CONTACTS.map((contact, index) => {
          const isPrimary = index === 0;
          const isUrgent = contact.key === 'triple-zero';
          return (
            <Pressable
              key={contact.key}
              onPress={() => call(contact.dialNumber)}
              style={[
                styles.contactRow,
                {
                  backgroundColor: isPrimary ? theme.accent : 'transparent',
                  borderColor: isUrgent ? theme.safety : theme.border,
                  borderWidth: isPrimary ? 0 : 1,
                },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isPrimary ? styles.primaryText : isUrgent ? { color: theme.safety } : undefined}
              >
                {contact.name} — {contact.number}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textMuted"
                style={isPrimary ? [styles.primaryText, styles.primarySubtext] : undefined}
              >
                {contact.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  heading: {
    fontSize: 16,
  },
  body: {
    lineHeight: 20,
  },
  contacts: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  contactRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  primaryText: {
    color: '#14161A',
  },
  primarySubtext: {
    opacity: 0.75,
  },
});
