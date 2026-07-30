import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import { fetchArticles, type ArticleRow } from '@/infrastructure/api/lifestyleApi';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';

/** Newsletter screen (Requirement 25), live from the backend. */
export default function NewsletterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: articles = [], isLoading } = useQuery<ArticleRow[]>({
    queryKey: ['articles'],
    queryFn: fetchArticles,
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
        <Text variant="title">Newsletter</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md }}>
        {isLoading ? (
          <Text variant="body" muted>Loading…</Text>
        ) : (
          articles.map((a) => (
            <Card key={a.id} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
                <BookOpen size={20} color={theme.colors.accent} />
              </View>
              <Text variant="title" style={styles.title}>{a.title}</Text>
              <Text variant="body" muted numberOfLines={3}>
                {a.body}
              </Text>
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
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.xs },
});
