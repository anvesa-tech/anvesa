import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { typography } from '../theme';
import { useTheme } from '../ThemeProvider';

type Variant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
}

/**
 * Typography primitive enforcing the design hierarchy.
 * Respects dynamic font scaling for accessibility (Requirement 32.5).
 */
export function Text({ variant = 'body', color, muted, style, ...rest }: TextProps) {
  const theme = useTheme();
  const resolved = color ?? (muted ? theme.colors.textMuted : theme.colors.text);
  return <RNText {...rest} style={[typography[variant], { color: resolved }, style]} />;
}
