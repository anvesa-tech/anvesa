import React from 'react';
import { View, StyleSheet } from 'react-native';
import { radius } from '../theme';
import { Text } from './Text';
import type { Grade } from '@/domain/product';

/**
 * Floating grade badge shown on product imagery.
 * Color-coded by the objective grade (A best → D worst).
 * The grade itself is computed by the backend Grading_Engine; this only renders it.
 */
const GRADE_COLORS: Record<Grade, { bg: string; fg: string }> = {
  A: { bg: '#22C55E', fg: '#06210F' },
  B: { bg: '#A3E635', fg: '#1A2E05' },
  C: { bg: '#FACC15', fg: '#3D2A00' },
  D: { bg: '#EF4444', fg: '#FFFFFF' },
};

interface GradeBadgeProps {
  grade: Grade;
  size?: number;
}

export function GradeBadge({ grade, size = 40 }: GradeBadgeProps) {
  const c = GRADE_COLORS[grade];
  return (
    <View
      accessibilityLabel={`Grade ${grade}`}
      style={[
        styles.base,
        { backgroundColor: c.bg, width: size, height: size, borderRadius: radius.md },
      ]}
    >
      <Text color={c.fg} style={[styles.letter, { fontSize: size * 0.5 }]}>
        {grade}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#111111',
    shadowColor: '#111111',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
  },
  letter: {
    fontWeight: '900',
  },
});
