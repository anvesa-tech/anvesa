import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BORDER_WIDTH, MIN_TOUCH_TARGET, radius, spacing } from '../theme';
import { useTheme } from '../ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Rounded pill button with a spring press animation (card lift / bounce).
 * No glassmorphism. Meets the minimum touch target (Requirement 32.6).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  fullWidth,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'accent'
        ? theme.colors.accent
        : variant === 'ghost'
          ? 'transparent'
          : theme.colors.surface;
  const fg =
    variant === 'primary' || variant === 'accent'
      ? theme.colors.onPrimary
      : theme.colors.text;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: theme.colors.border,
          borderWidth: variant === 'ghost' ? 0 : BORDER_WIDTH,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant !== 'ghost' && theme.shadow.soft,
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <Text variant="caption" color={fg} style={styles.label}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
