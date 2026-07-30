import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';
import { BORDER_WIDTH, radius, spacing } from '../theme';
import { useTheme } from '../ThemeProvider';

interface CardProps extends ViewProps {
  elevation?: 'soft' | 'lifted' | 'none';
  padded?: boolean;
}

/**
 * Rounded card with a soft border and soft elevation.
 * Thin border (not oversized) per the soft neo-brutalist direction.
 */
export function Card({ elevation = 'soft', padded = true, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          padding: padded ? spacing.md : 0,
        },
        elevation !== 'none' && theme.shadow[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: BORDER_WIDTH,
  },
});
