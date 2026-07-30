import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { radius, spacing } from '../theme';
import { Text } from './Text';

/**
 * Consistent placeholder for tabs not yet implemented, so the app is fully
 * navigable while screens are built out incrementally.
 */
export function ComingSoon({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + spacing.lg },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>{icon}</View>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" muted style={styles.subtitle}>
        {subtitle}
      </Text>
      <View style={[styles.pill, { borderColor: theme.colors.border }]}>
        <Text variant="caption" color={theme.colors.primary}>
          In progress
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.huge,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  pill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
});
