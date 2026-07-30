import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Package, Truck, CheckCircle2 } from 'lucide-react-native';
import { fetchOrders, type ServerOrder } from '@/infrastructure/api/ordersApi';
import { useAuthStore } from '@/application/authStore';
import { formatINR } from '@/domain/product';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';

/**
 * Orders screen (Requirement 20). Lists the authenticated user's orders from
 * the backend `order.list`, refreshing whenever the tab gains focus.
 */
export default function OrdersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const { data: orders = [], refetch } = useQuery<ServerOrder[]>({
    queryKey: ['orders', userId],
    queryFn: fetchOrders,
    enabled: !!userId,
    staleTime: 10_000,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (userId) void refetch();
    }, [userId, refetch]),
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <Text variant="heading">Orders</Text>
          <Text variant="caption" muted>Track your verified deliveries</Text>
        </View>

        {orders.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <Package size={36} color={theme.colors.primary} />
            </View>
            <Text variant="title">No orders yet</Text>
            <Text variant="body" muted style={styles.emptyText}>
              Your placed orders and delivery tracking will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.body}>
            {orders.map((o) => (
              <Card key={o.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text variant="title">#{o.id.slice(0, 8)}</Text>
                  <StatusPill status={o.status} />
                </View>
                <Text variant="caption" muted>
                  {o.items.length} item{o.items.length === 1 ? '' : 's'} · {formatINR(o.totalCents)}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Status legend illustrating the tracking states */}
        <View style={styles.legend}>
          <Text variant="caption" muted style={styles.legendTitle}>How tracking works</Text>
          <LegendRow icon={<Package size={16} color={theme.colors.primary} />} label="Placed & packed" />
          <LegendRow icon={<Truck size={16} color={theme.colors.warning} />} label="Out for delivery" />
          <LegendRow icon={<CheckCircle2 size={16} color={theme.colors.accent} />} label="Delivered" />
        </View>
      </ScrollView>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.primarySoft }]}>
      <Text variant="caption" color={theme.colors.primary}>
        {status}
      </Text>
    </View>
  );
}

function LegendRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.legendRow}>
      {icon}
      <Text variant="body" muted>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  iconWrap: { width: 80, height: 80, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyText: { textAlign: 'center' },
  body: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  orderCard: { gap: spacing.xs },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  legend: { marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.xs },
  legendTitle: { marginBottom: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
