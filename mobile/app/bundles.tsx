import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package2 } from 'lucide-react-native';
import { fetchBundles, type BundleRow } from '@/infrastructure/api/lifestyleApi';
import { formatINR } from '@/domain/product';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';

/** Functional bundles screen (Requirement 22), live from the backend. */
export default function BundlesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: bundles = [], isLoading } = useQuery<BundleRow[]>({
    queryKey: ['bundles'],
    queryFn: fetchBundles,
    staleTime: 60_000,
  });

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
        <Text variant="title">Functional Bundles</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md }}>
        {isLoading ? (
          <Text variant="body" muted>Loading…</Text>
        ) : (
          bundles.map((b) => (
            <Card key={b.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Package2 size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text variant="title">{b.name}</Text>
                  <Text variant="caption" muted>
                    {b.products.length} products · multi-brand
                  </Text>
                </View>
                <Text variant="title" color={theme.colors.primary}>
                  {formatINR(b.priceCents)}
                </Text>
              </View>
              <Text variant="caption" muted numberOfLines={2}>
                {b.products.map((p) => p.name).join(' · ')}
              </Text>
              {b.availability.partiallyAvailable && (
                <Text variant="caption" color={theme.colors.warning}>
                  Some items currently out of stock
                </Text>
              )}
            </Card>
          ))
        )}
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
  card: { gap: spacing.xs },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
