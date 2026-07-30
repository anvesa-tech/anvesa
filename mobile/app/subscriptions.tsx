import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Milk, Egg, Wheat, Apple, Carrot } from 'lucide-react-native';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';

type SubStatus = 'active' | 'paused';

const ITEMS = [
  { key: 'milk', label: 'A2 Cow Milk', icon: Milk },
  { key: 'bread', label: 'Multigrain Bread', icon: Wheat },
  { key: 'eggs', label: 'Free-Range Eggs', icon: Egg },
  { key: 'veg', label: 'Seasonal Vegetables', icon: Carrot },
  { key: 'fruit', label: 'Fresh Fruits', icon: Apple },
];

/** Subscriptions screen (Requirement 21): 2-day recurring staples. */
export default function SubscriptionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [statuses, setStatuses] = useState<Record<string, SubStatus | undefined>>({});

  const cycle = (key: string) =>
    setStatuses((p) => ({ ...p, [key]: p[key] === 'active' ? 'paused' : 'active' }));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <ArrowLeft size={22} color={theme.colors.text} />
        </Pressable>
        <Text variant="title">Subscriptions</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md }}>
        <Text variant="caption" muted>Recurring every 2 days · pause or resume anytime</Text>
        {ITEMS.map((it) => {
          const status = statuses[it.key];
          const Icon = it.icon;
          const active = status === 'active';
          return (
            <Card key={it.key} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
                <Icon size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text variant="title" style={styles.itemTitle}>{it.label}</Text>
                <Text variant="caption" muted>
                  {status ? (active ? 'Active · next in 2 days' : 'Paused') : 'Not subscribed'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => cycle(it.key)}
                style={[
                  styles.action,
                  {
                    backgroundColor: active ? theme.colors.surfaceAlt : theme.colors.primary,
                    borderColor: active ? theme.colors.border : theme.colors.primary,
                  },
                ]}
              >
                <Text variant="caption" color={active ? theme.colors.text : theme.colors.onPrimary}>
                  {status ? (active ? 'Pause' : 'Resume') : 'Subscribe'}
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  itemTitle: { fontSize: 15 },
  action: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1.5 },
});
