import React from 'react';
import { View, StyleSheet } from 'react-native';
import { radius, spacing } from '../theme';
import { Text } from './Text';

interface BadgeProps {
  label: string;
  bg: string;
  fg: string;
}

/** Bold, rounded, color-coded pill badge. */
export function Badge({ label, bg, fg }: BadgeProps) {
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text variant="caption" color={fg} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#111111',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
