import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useCartStore } from '@/application/cartStore';
import { formatINR } from '@/domain/product';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing, MIN_TOUCH_TARGET } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Button } from '@/presentation/design-system/components/Button';
import { GradeBadge } from '@/presentation/design-system/components/GradeBadge';

/**
 * Cart screen (Requirement 13). Lists cart lines with quantity controls and a
 * live subtotal from the shared cart store, with a checkout CTA.
 */
export default function CartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCartStore((s) => Object.values(s.lines));
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotalCents = useCartStore((s) => s.subtotalCents());

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
        <Text variant="title">Your Cart</Text>
        <View style={{ width: 44 }} />
      </View>

      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="heading">Your cart is empty</Text>
          <Text variant="body" muted style={styles.emptySub}>
            Add verified products from the marketplace.
          </Text>
          <Button label="Browse marketplace" variant="primary" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
            {lines.map((line) => (
              <View
                key={line.product.id}
                style={[styles.line, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={[styles.thumb, { backgroundColor: line.product.imageColor }]}>
                  <GradeBadge grade={line.product.grade} size={28} />
                </View>
                <View style={styles.lineBody}>
                  <Text variant="caption" muted numberOfLines={1}>
                    {line.product.brand}
                  </Text>
                  <Text variant="body" numberOfLines={1}>
                    {line.product.name}
                  </Text>
                  <Text variant="title" style={styles.linePrice}>
                    {formatINR(line.product.priceCents)}
                  </Text>
                </View>
                <View style={styles.qtyCol}>
                  <View style={styles.qtyRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                      onPress={() => setQty(line.product.id, line.qty - 1)}
                      style={[styles.qtyBtn, { borderColor: theme.colors.border }]}
                    >
                      <Minus size={16} color={theme.colors.text} />
                    </Pressable>
                    <Text variant="title" style={styles.qtyText}>
                      {line.qty}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                      onPress={() => setQty(line.product.id, line.qty + 1)}
                      style={[styles.qtyBtn, { borderColor: theme.colors.border }]}
                    >
                      <Plus size={16} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove item"
                    onPress={() => remove(line.product.id)}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <View
            style={[
              styles.bar,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + spacing.sm },
            ]}
          >
            <View>
              <Text variant="caption" muted>
                Subtotal
              </Text>
              <Text variant="heading">{formatINR(subtotalCents)}</Text>
            </View>
            <Button label="Checkout" variant="primary" onPress={() => router.push('/checkout')} />
          </View>
        </>
      )}
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
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptySub: { textAlign: 'center', marginBottom: spacing.sm },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBody: { flex: 1, gap: 2 },
  linePrice: { fontSize: 16 },
  qtyCol: { alignItems: 'center', gap: spacing.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { minWidth: 24, textAlign: 'center' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
});
