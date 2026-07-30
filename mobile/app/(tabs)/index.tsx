import React, { useCallback, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ShoppingBag } from 'lucide-react-native';
import { useHomeGroups } from '@/application/useHomeGroups';
import { useSearch } from '@/application/useSearch';
import { useCartStore } from '@/application/cartStore';
import type { ProductCardModel, ProductGroup } from '@/domain/product';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { ProductCard } from '@/presentation/design-system/components/ProductCard';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - spacing.lg * 2 - spacing.md) / 2;

const FILTERS = [
  'Low Sugar',
  'High Protein',
  'Kids Safe',
  'Diabetic Friendly',
  'Gluten Free',
  'Heart Friendly',
  'Low Sodium',
  'High Fibre',
  'Weight Loss',
  'Low Fat',
];

/**
 * Marketplace home — the hero experience.
 * Products grouped by the nine categories (Requirement 5.1) with product cards
 * showing image, grade, brand, price, discount, quick add, and wishlist.
 * Currently backed by mock data; swaps to Marketplace_Service via tRPC later.
 */
export default function MarketplaceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addToCart = useCartStore((s) => s.add);
  const cartCount = useCartStore((s) => s.count());
  const { groups, isLive } = useHomeGroups();
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [queryText, setQueryText] = useState('');
  const { active: searching, results, isLoading: searchLoading } = useSearch(queryText, activeFilters);

  const byId = React.useMemo(() => {
    const map: Record<string, ProductCardModel> = {};
    for (const g of groups) for (const p of g.products) map[p.id] = p;
    for (const p of results) map[p.id] = p;
    return map;
  }, [groups, results]);

  const toggleFilter = useCallback(
    (f: string) =>
      setActiveFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])),
    [],
  );

  const onQuickAdd = useCallback(
    (id: string) => {
      const product = byId[id];
      if (product) addToCart(product);
    },
    [addToCart, byId],
  );
  const onToggleWishlist = useCallback(
    (id: string) => setWishlist((w) => ({ ...w, [id]: !w[id] })),
    [],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="caption" muted>
              Deliver to · Cyber Park, Gurugram
            </Text>
            <Text variant="heading">ANVESA</Text>
            <Text variant="caption" color={theme.colors.primary} style={styles.tagline}>
              Buy what’s verified, not what’s marketed.
            </Text>
            <View style={styles.liveRow}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: isLive ? theme.colors.success : theme.colors.warning },
                ]}
              />
              <Text variant="caption" muted>
                {isLive ? 'Live · graded by ANVESA' : 'Offline sample data'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${cartCount} items`}
            onPress={() => router.push('/cart')}
            style={[styles.cartBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <ShoppingBag size={22} color={theme.colors.text} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.colors.primary }]}>
                <Text variant="caption" color={theme.colors.onPrimary} style={styles.cartBadgeText}>
                  {cartCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.search, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Search size={18} color={theme.colors.textMuted} />
          <TextInput
            value={queryText}
            onChangeText={setQueryText}
            placeholder="Search verified products"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search verified products"
          />
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = activeFilters.includes(f);
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityLabel={`${f} filter`}
                accessibilityState={{ selected: active }}
                onPress={() => toggleFilter(f)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={active ? theme.colors.onPrimary : theme.colors.text}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search results OR product groups */}
        {searching ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="title">
                {searchLoading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
              </Text>
              {activeFilters.length > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setActiveFilters([])}>
                  <Text variant="caption" color={theme.colors.primary}>
                    Clear filters
                  </Text>
                </Pressable>
              )}
            </View>
            {!searchLoading && results.length === 0 ? (
              <View style={styles.empty}>
                <Text variant="body" muted>
                  No verified products match your search.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {results.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    width={CARD_W}
                    wishlisted={!!wishlist[product.id]}
                    onQuickAdd={onQuickAdd}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          groups.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              cardWidth={CARD_W}
              wishlist={wishlist}
              onQuickAdd={onQuickAdd}
              onToggleWishlist={onToggleWishlist}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function GroupSection({
  group,
  cardWidth,
  wishlist,
  onQuickAdd,
  onToggleWishlist,
}: {
  group: ProductGroup;
  cardWidth: number;
  wishlist: Record<string, boolean>;
  onQuickAdd: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="title">{group.title}</Text>
        <Text variant="caption" color={theme.colors.primary}>
          See all
        </Text>
      </View>
      <View style={styles.grid}>
        {group.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            width={cardWidth}
            wishlisted={!!wishlist[product.id]}
            onQuickAdd={onQuickAdd}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagline: { marginTop: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  cartBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
    elevation: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { fontSize: 11 },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    shadowColor: '#111111',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    height: '100%',
  },
  empty: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  filters: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 2.5,
    shadowColor: '#111111',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
  },
  section: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionHead: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
