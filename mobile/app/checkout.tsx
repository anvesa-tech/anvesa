import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, MapPin, Clock, CreditCard } from 'lucide-react-native';
import { useCartStore } from '@/application/cartStore';
import { useAuthStore } from '@/application/authStore';
import {
  setServerCartItem,
  placeOrder,
  getPaymentConfig,
  createPaymentOrder,
} from '@/infrastructure/api/ordersApi';
import { openRazorpayCheckout, razorpayCheckoutSupported } from '@/infrastructure/payments/razorpayCheckout';
import { formatINR } from '@/domain/product';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';
import { Button } from '@/presentation/design-system/components/Button';

const DELIVERY_CENTS = 3000;

/**
 * Checkout screen (Requirement 16). Summarizes address, delivery slot, and
 * payment, computes the zero-floored total, and places the order. Delivery is
 * limited to the CDS Corporate / Cyber Park, Gurugram zone.
 */
export default function CheckoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subtotalCents = useCartStore((s) => s.subtotalCents());
  const lines = useCartStore((s) => Object.values(s.lines));
  const clear = useCartStore((s) => s.clear);
  const userId = useAuthStore((s) => s.userId);
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const totalCents = Math.max(0, subtotalCents + (subtotalCents > 0 ? DELIVERY_CENTS : 0));

  async function handlePlaceOrder() {
    setError(null);
    // Persist to the backend when signed in and every line has a real variant.
    const serverAble =
      !!userId && lines.length > 0 && lines.every((l) => !!l.product.variantId);
    if (serverAble && userId) {
      setPlacing(true);
      try {
        for (const l of lines) {
          await setServerCartItem(userId, l.product.variantId as string, l.qty);
        }

        const addressId = 'addr-cyberpark';
        const slotId = 'slot-today-evening';

        // Real Razorpay flow when keys are configured (web); otherwise the dev flow.
        let payment = { orderId: 'rzp_dev', paymentId: 'pay_dev', signature: 'dev-valid' };
        const config = await getPaymentConfig().catch(() => null);
        if (config?.configured && config.keyId && razorpayCheckoutSupported) {
          const created = await createPaymentOrder({ addressId });
          if (!created.ok || !created.razorpayOrderId) {
            throw new Error(created.error ?? 'Could not start payment');
          }
          const result = await openRazorpayCheckout({
            keyId: config.keyId,
            razorpayOrderId: created.razorpayOrderId,
            amountCents: created.amountCents ?? totalCents,
            currency: created.currency ?? 'INR',
            name: 'ANVESA',
          });
          if (!result) {
            setError('Payment cancelled.');
            setPlacing(false);
            return;
          }
          payment = result;
        }

        const res = await placeOrder({ addressId, slotId, payment });
        if (!res.ok) throw new Error(res.error ?? 'Order could not be placed');
        setOrderRef(res.orderId ?? null);
        clear();
        setPlaced(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Order failed');
      } finally {
        setPlacing(false);
      }
      return;
    }
    // Offline / not-signed-in fallback: confirm locally.
    clear();
    setPlaced(true);
  }

  if (placed) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.successCircle, { backgroundColor: theme.colors.accentSoft }]}>
          <Check size={44} color={theme.colors.accent} strokeWidth={3} />
        </View>
        <Text variant="heading">Order placed</Text>
        <Text variant="body" muted style={styles.centerText}>
          Your verified order is on its way to Cyber Park, Gurugram.
        </Text>
        {orderRef && (
          <Text variant="caption" muted>
            Order #{orderRef.slice(0, 8)}
          </Text>
        )}
        <Button label="Back to marketplace" variant="primary" onPress={() => router.replace('/')} />
      </View>
    );
  }

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
        <Text variant="title">Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        <Card style={styles.rowCard}>
          <MapPin size={20} color={theme.colors.primary} />
          <View style={styles.flex}>
            <Text variant="title" style={styles.rowTitle}>Delivery address</Text>
            <Text variant="caption" muted>CDS Corporate, Cyber Park, Gurugram · within 5 km zone</Text>
          </View>
          <Check size={18} color={theme.colors.accent} />
        </Card>

        <Card style={styles.rowCard}>
          <Clock size={20} color={theme.colors.primary} />
          <View style={styles.flex}>
            <Text variant="title" style={styles.rowTitle}>Delivery slot</Text>
            <Text variant="caption" muted>Today · 6:00 PM – 8:00 PM</Text>
          </View>
          <Check size={18} color={theme.colors.accent} />
        </Card>

        <Card style={styles.rowCard}>
          <CreditCard size={20} color={theme.colors.primary} />
          <View style={styles.flex}>
            <Text variant="title" style={styles.rowTitle}>Payment</Text>
            <Text variant="caption" muted>Razorpay · UPI / Card</Text>
          </View>
          <Check size={18} color={theme.colors.accent} />
        </Card>

        <Card>
          <Text variant="title" style={styles.summaryTitle}>Order summary</Text>
          <SummaryRow label="Subtotal" value={formatINR(subtotalCents)} />
          <SummaryRow label="Delivery" value={subtotalCents > 0 ? formatINR(DELIVERY_CENTS) : formatINR(0)} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SummaryRow label="Total" value={formatINR(totalCents)} bold />
        </Card>
      </ScrollView>

      <View
        style={[
          styles.bar,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        {error && (
          <Text variant="caption" color={theme.colors.error} style={styles.errorText}>
            {error}
          </Text>
        )}
        <Button
          label={placing ? 'Placing order…' : `Place order · ${formatINR(totalCents)}`}
          variant="primary"
          fullWidth
          disabled={placing || subtotalCents === 0}
          onPress={handlePlaceOrder}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant={bold ? 'title' : 'body'} muted={!bold}>
        {label}
      </Text>
      <Text variant={bold ? 'title' : 'body'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  centerText: { textAlign: 'center', marginBottom: spacing.sm },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
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
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { fontSize: 15 },
  flex: { flex: 1 },
  summaryTitle: { marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  divider: { height: 1, marginVertical: spacing.xs },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  errorText: { marginBottom: spacing.xs, textAlign: 'center' },
});
