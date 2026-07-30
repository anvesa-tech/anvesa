import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Heart, Plus } from 'lucide-react-native';
import { discountPercent, formatINR, type ProductCardModel } from '@/domain/product';
import { BORDER_WIDTH, radius, spacing, MIN_TOUCH_TARGET } from '../theme';
import { useTheme } from '../ThemeProvider';
import { Text } from './Text';
import { GradeBadge } from './GradeBadge';

interface ProductCardProps {
  product: ProductCardModel;
  onQuickAdd?: (id: string) => void;
  onToggleWishlist?: (id: string) => void;
  wishlisted?: boolean;
  width: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Product card: large image, floating grade badge, brand, price, discount,
 * quick-add and wishlist controls. Rounded corners, soft elevation,
 * card-lift press animation (Requirement 6, design system Product Cards).
 */
export function ProductCard({
  product,
  onQuickAdd,
  onToggleWishlist,
  wishlisted,
  width,
}: ProductCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);
  const discount = discountPercent(product.priceCents, product.mrpCents);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}, grade ${product.grade}, ${formatINR(product.priceCents)}`}
      onPress={() => router.push(`/product/${product.id}`)}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      style={[
        styles.card,
        {
          width,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        theme.shadow.soft,
        animatedStyle,
      ]}
    >
      <View style={[styles.image, { backgroundColor: product.imageColor }]}>
        <View style={styles.gradeFloat}>
          <GradeBadge grade={product.grade} size={36} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          onPress={() => onToggleWishlist?.(product.id)}
          hitSlop={10}
          style={[styles.heart, { backgroundColor: theme.colors.surface }]}
        >
          <Heart
            size={18}
            color={wishlisted ? theme.colors.error : theme.colors.textMuted}
            fill={wishlisted ? theme.colors.error : 'transparent'}
          />
        </Pressable>
        {discount > 0 && (
          <View style={[styles.discount, { backgroundColor: theme.colors.accent }]}>
            <Text variant="caption" color={theme.colors.onPrimary} style={styles.discountText}>
              {discount}% OFF
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text variant="caption" muted numberOfLines={1}>
          {product.brand}
        </Text>
        <Text variant="body" numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>

        <View style={styles.priceRow}>
          <View style={styles.prices}>
            <Text variant="title" style={styles.price}>
              {formatINR(product.priceCents)}
            </Text>
            {discount > 0 && (
              <Text variant="caption" muted style={styles.mrp}>
                {formatINR(product.mrpCents)}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            onPress={() => onQuickAdd?.(product.id)}
            hitSlop={8}
            style={[styles.add, { backgroundColor: theme.colors.primary }]}
          >
            <Plus size={20} color={theme.colors.onPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
  },
  image: {
    height: 130,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  gradeFloat: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  heart: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discount: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#111111',
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  body: {
    padding: spacing.sm,
    gap: 2,
  },
  name: {
    minHeight: 40,
  },
  priceRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prices: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontSize: 16,
  },
  mrp: {
    textDecorationLine: 'line-through',
  },
  add: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.sm,
    borderWidth: BORDER_WIDTH,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
