import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Flame, Star } from 'lucide-react-native';
import { fetchLeaderboard, type LeaderboardRow } from '@/infrastructure/api/rewardsApi';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';

/**
 * Rewards screen (Requirement 23). Shows the user's Satya XP snapshot and the
 * live top-100 leaderboard from the backend Rewards_Service.
 */
export default function RewardsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardRow[]>({
    queryKey: ['rewards', 'leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 30_000,
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <Text variant="heading">Satya XP</Text>
          <Text variant="caption" muted>
            Earn XP for verified scans and purchases.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon={<Star size={20} color={theme.colors.primary} />} label="Your XP" value="0" />
          <StatCard icon={<Flame size={20} color={theme.colors.warning} />} label="Scan streak" value="0" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Trophy size={18} color={theme.colors.primary} />
            <Text variant="title">Leaderboard</Text>
          </View>
          <Card padded={false} style={styles.list}>
            {isLoading ? (
              <View style={styles.pad}>
                <Text variant="body" muted>Loading…</Text>
              </View>
            ) : leaderboard.length === 0 ? (
              <View style={styles.pad}>
                <Text variant="body" muted>Be the first to earn Satya XP.</Text>
              </View>
            ) : (
              leaderboard.map((row, i) => (
                <View
                  key={row.userId}
                  style={[
                    styles.row,
                    i < leaderboard.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Text variant="title" style={[styles.rank, { color: theme.colors.primary }]}>
                    {i + 1}
                  </Text>
                  <Text variant="body" style={styles.flex} numberOfLines={1}>
                    {row.userId.slice(0, 8)}…
                  </Text>
                  <Text variant="title">{row.xp} XP</Text>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      {icon}
      <Text variant="heading" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  stat: { flex: 1, alignItems: 'flex-start', gap: 4 },
  statValue: { fontSize: 28 },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  list: { overflow: 'hidden' },
  pad: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rank: { minWidth: 24 },
  flex: { flex: 1 },
});
