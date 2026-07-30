import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronRight, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { useProductDetail } from '@/application/useProductDetail';
import { useCartStore } from '@/application/cartStore';
import { discountPercent, formatINR } from '@/domain/product';
import type { GradeFactor, NutritionRow, RedFlag } from '@/domain/productDetail';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';
import { Button } from '@/presentation/design-system/components/Button';
import { GradeBadge } from '@/presentation/design-system/components/GradeBadge';
import { ProductCard } from '@/presentation/design-system/components/ProductCard';

/**
 * Product detail page (Requirement 8): large imagery, grade + explanation +
 * reasoning, nutrition panel, ingredients, red flags, better alternatives,
 * and reviews. Mock-backed; swaps to Product_Service later.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const add = useCartStore((s) => s.add);

  const { data: detail, isLoading } = useProductDetail(id);

  if (isLoading) {
    return (
      <View
        style={[
          styles.notFound,
          { backgroundColor: theme.colors.background, paddingTop: insets.top + 80 },
        ]}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="body" muted>
          Loading product…
        </Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.notFound, { backgroundColor: theme.colors.background, paddingTop: insets.top + 80 }]}>
        <Text variant="title">Product not found</Text>
        <Button label="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const discount = discountPercent(detail.priceCents, detail.mrpCents);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={[styles.hero, { backgroundColor: detail.imageColor, paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: theme.colors.surface }]}
          >
            <ArrowLeft size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.heroGrade}>
            <GradeBadge grade={detail.grade} size={64} />
          </View>
        </View>

        <View style={styles.body}>
          <Text variant="caption" muted>
            {detail.brand}
          </Text>
          <Text variant="heading" style={styles.name}>
            {detail.name}
          </Text>
          <View style={styles.priceRow}>
            <Text variant="title">{formatINR(detail.priceCents)}</Text>
            {discount > 0 && (
              <>
                <Text variant="body" muted style={styles.mrp}>
                  {formatINR(detail.mrpCents)}
                </Text>
                <Text variant="caption" color={theme.colors.accent}>
                  {discount}% OFF
                </Text>
              </>
            )}
          </View>

          {/* Grade explanation */}
          <Card style={styles.gradeCard}>
            <View style={styles.gradeCardHead}>
              <GradeBadge grade={detail.grade} size={44} />
              <View style={styles.flex}>
                <Text variant="title">Grade {detail.grade}</Text>
                <Text variant="caption" muted>
                  Objective. Never influenced by brands or ads.
                </Text>
              </View>
            </View>
            <Text variant="body" style={styles.gradeExplain}>
              {detail.gradeExplanation}
            </Text>
          </Card>

          {/* Why this grade */}
          <SectionTitle>Why it got this grade</SectionTitle>
          <Card padded={false} style={styles.list}>
            {detail.gradeReasoning.map((f, i) => (
              <ReasoningItem key={f.factor} item={f} last={i === detail.gradeReasoning.length - 1} />
            ))}
          </Card>

          {/* Red flags */}
          {detail.redFlags.length > 0 && (
            <>
              <SectionTitle>Red flags</SectionTitle>
              <View style={styles.flags}>
                {detail.redFlags.map((f) => (
                  <RedFlagItem key={f.title} flag={f} />
                ))}
              </View>
            </>
          )}

          {/* Nutrition */}
          <SectionTitle>Nutrition · per 100g</SectionTitle>
          <Card padded={false} style={styles.list}>
            {detail.nutrition.map((n, i) => (
              <NutritionItem key={n.label} row={n} last={i === detail.nutrition.length - 1} />
            ))}
          </Card>

          {/* Ingredients */}
          <SectionTitle>Ingredients</SectionTitle>
          <Card>
            <Text variant="body" muted>
              {detail.ingredients.join(' · ')}
            </Text>
          </Card>

          {/* Better alternatives */}
          {detail.betterAlternatives.length > 0 && (
            <>
              <SectionTitle>Better alternatives</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.altRow}>
                {detail.betterAlternatives.map((alt) => (
                  <ProductCard
                    key={alt.id}
                    product={alt}
                    width={170}
                    onQuickAdd={() => add(alt)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Reviews */}
          <SectionTitle>Reviews</SectionTitle>
          {detail.reviews.length === 0 ? (
            <Card>
              <Text variant="body" muted>
                No reviews yet. Purchase this product to leave the first review.
              </Text>
            </Card>
          ) : (
            detail.reviews.map((r) => (
              <Card key={r.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <Text variant="title" style={styles.reviewAuthor}>
                    {r.author}
                  </Text>
                  <Text variant="caption" color={theme.colors.warning}>
                    {'★'.repeat(r.rating)}
                    <Text variant="caption" muted>
                      {'★'.repeat(5 - r.rating)}
                    </Text>
                  </Text>
                </View>
                <Text variant="body" muted>
                  {r.text}
                </Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <View>
          <Text variant="caption" muted>
            Total
          </Text>
          <Text variant="title">{formatINR(detail.priceCents)}</Text>
        </View>
        <Button label="Add to cart" variant="primary" onPress={() => add(detail)} />
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="title" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

function toneColor(tone: 'good' | 'neutral' | 'bad', theme: ReturnType<typeof useTheme>) {
  return tone === 'good' ? theme.colors.success : tone === 'bad' ? theme.colors.error : theme.colors.textMuted;
}

function ReasoningItem({ item, last }: { item: GradeFactor; last: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.rowItem, !last && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 }]}>
      <View style={[styles.dot, { backgroundColor: toneColor(item.tone, theme) }]}>
        {item.tone === 'good' ? (
          <Check size={12} color="#fff" strokeWidth={3} />
        ) : (
          <TriangleAlert size={12} color="#fff" strokeWidth={2.5} />
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="body" style={styles.rowLabel}>
          {item.factor}
        </Text>
        <Text variant="caption" muted>
          {item.detail}
        </Text>
      </View>
    </View>
  );
}

function NutritionItem({ row, last }: { row: NutritionRow; last: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.nutriRow,
        !last && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
      ]}
    >
      <Text variant="body">{row.label}</Text>
      <Text variant="body" color={toneColor(row.tone, theme)} style={styles.nutriValue}>
        {row.value}
      </Text>
    </View>
  );
}

function RedFlagItem({ flag }: { flag: RedFlag }) {
  const theme = useTheme();
  const c =
    flag.severity === 'high'
      ? theme.colors.error
      : flag.severity === 'medium'
        ? theme.colors.warning
        : theme.colors.textMuted;
  return (
    <Card style={[styles.flagCard, { borderColor: c }]}>
      <View style={styles.flagHead}>
        <TriangleAlert size={16} color={c} />
        <Text variant="body" style={styles.rowLabel}>
          {flag.title}
        </Text>
      </View>
      <Text variant="caption" muted>
        {flag.note}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', gap: spacing.md },
  hero: {
    height: 260,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGrade: { alignItems: 'flex-end', paddingBottom: spacing.md },
  body: { padding: spacing.lg, gap: spacing.xs },
  name: { marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs },
  mrp: { textDecorationLine: 'line-through' },
  gradeCard: { marginTop: spacing.md, gap: spacing.sm },
  gradeCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gradeExplain: { marginTop: spacing.xs },
  flex: { flex: 1 },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '700' },
  nutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nutriValue: { fontWeight: '700' },
  flags: { gap: spacing.sm },
  flagCard: { borderWidth: 1.5, gap: 4 },
  flagHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  altRow: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  review: { marginBottom: spacing.sm, gap: spacing.xs },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 15 },
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
  },
});
