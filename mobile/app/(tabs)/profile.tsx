import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Heart, Target, Package2, Repeat, BookOpen, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Card } from '@/presentation/design-system/components/Card';
import { Button } from '@/presentation/design-system/components/Button';

const DIETS = ['Veg', 'Non-Veg', 'Vegan', 'Eggetarian'];
const GOALS = ['Weight Loss', 'High Protein', 'Heart Health', 'Diabetic Friendly'];

/**
 * Profile & health screen (Requirement 4). Captures the health profile that
 * personalizes grades, filters, and recommendations.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [diet, setDiet] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleGoal = (g: string) =>
    setGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
            <User size={28} color={theme.colors.primary} />
          </View>
          <View>
            <Text variant="heading">Health Profile</Text>
            <Text variant="caption" muted>Personalize your grades & filters</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Card style={styles.card}>
            <Text variant="title" style={styles.cardTitle}>Basics</Text>
            <View style={styles.fieldRow}>
              <Field label="Age" value={age} onChange={setAge} placeholder="28" />
              <Field label="Height (cm)" value={heightCm} onChange={setHeightCm} placeholder="170" />
              <Field label="Weight (kg)" value={weightKg} onChange={setWeightKg} placeholder="68" />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.rowHead}>
              <Heart size={18} color={theme.colors.primary} />
              <Text variant="title">Diet</Text>
            </View>
            <View style={styles.chips}>
              {DIETS.map((d) => (
                <Chip key={d} label={d} active={diet === d} onPress={() => setDiet(d)} />
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.rowHead}>
              <Target size={18} color={theme.colors.primary} />
              <Text variant="title">Goals</Text>
            </View>
            <View style={styles.chips}>
              {GOALS.map((g) => (
                <Chip key={g} label={g} active={goals.includes(g)} onPress={() => toggleGoal(g)} />
              ))}
            </View>
          </Card>

          <Button
            label={saved ? 'Saved ✓' : 'Save profile'}
            variant="primary"
            fullWidth
            onPress={() => setSaved(true)}
          />

          <Text variant="title" style={styles.exploreTitle}>Explore</Text>
          <LinkRow
            icon={<Package2 size={20} color={theme.colors.primary} />}
            label="Functional Bundles"
            onPress={() => router.push('/bundles')}
          />
          <LinkRow
            icon={<Repeat size={20} color={theme.colors.primary} />}
            label="Subscriptions"
            onPress={() => router.push('/subscriptions')}
          />
          <LinkRow
            icon={<BookOpen size={20} color={theme.colors.primary} />}
            label="Newsletter"
            onPress={() => router.push('/newsletter')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.linkRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      {icon}
      <Text variant="body" style={styles.linkLabel}>
        {label}
      </Text>
      <ChevronRight size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="caption" muted style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="numeric"
        accessibilityLabel={label}
        style={[
          styles.input,
          { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text },
        ]}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text variant="caption" color={active ? theme.colors.onPrimary : theme.colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  cardTitle: { marginBottom: spacing.xs },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  fieldLabel: { marginBottom: 4 },
  input: { height: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16, fontWeight: '600' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1.5 },
  exploreTitle: { marginTop: spacing.md },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  linkLabel: { flex: 1 },
});

