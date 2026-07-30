import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { analyzeLabel, type LabelNutrition } from '@/infrastructure/api/scannerApi';
import { captureAndReadLabel, ocrSupported } from '@/infrastructure/ocr/labelOcr';
import { parseLabelText } from '@/infrastructure/ocr/parseLabelText';
import { useScanResultStore } from '@/application/scanResultStore';
import { useTheme } from '@/presentation/design-system/ThemeProvider';
import { radius, spacing } from '@/presentation/design-system/theme';
import { Text } from '@/presentation/design-system/components/Text';
import { Button } from '@/presentation/design-system/components/Button';

type NutriKey = keyof LabelNutrition;

const NUTRI_FIELDS: { key: NutriKey; label: string }[] = [
  { key: 'energyKcal', label: 'Energy (kcal)' },
  { key: 'sugarG', label: 'Sugar (g)' },
  { key: 'sodiumMg', label: 'Sodium (mg)' },
  { key: 'proteinG', label: 'Protein (g)' },
  { key: 'fatG', label: 'Fat (g)' },
  { key: 'satFatG', label: 'Sat. fat (g)' },
  { key: 'fibreG', label: 'Fibre (g)' },
];

/**
 * Label scanner (Requirement 10). Photograph a food label → server-side OCR →
 * auto-fill ingredients + nutrition → grade with ANVESA's own engine. Shared by
 * the Scan tab and the /analyze-label route. Pass `onBack` to show a back button.
 */
export function LabelScannerView({ onBack }: { onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setScanned = useScanResultStore((s) => s.setProduct);

  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [nutri, setNutri] = useState<Record<NutriKey, string>>({
    energyKcal: '',
    sugarG: '',
    sodiumMg: '',
    proteinG: '',
    fatG: '',
    satFatG: '',
    fibreG: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const runAnalyze = async (
    ingredientsText: string,
    nutritionState: Record<NutriKey, string>,
    productName: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const nutrition: LabelNutrition = {
        energyKcal: num(nutritionState.energyKcal),
        sugarG: num(nutritionState.sugarG),
        sodiumMg: num(nutritionState.sodiumMg),
        proteinG: num(nutritionState.proteinG),
        fatG: num(nutritionState.fatG),
        satFatG: num(nutritionState.satFatG),
        fibreG: num(nutritionState.fibreG),
      };
      const product = await analyzeLabel({
        name: productName.trim() || undefined,
        ingredientsText: ingredientsText.trim(),
        nutrition,
      });
      setScanned(product);
      router.push('/scan-result');
    } catch {
      setError('Could not analyse the label. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const scanPhoto = async () => {
    setOcrBusy(true);
    setOcrNote(null);
    setError(null);
    setOcrProgress(0);
    try {
      const text = await captureAndReadLabel((p) => setOcrProgress(p));
      if (text == null) return; // cancelled
      const parsed = parseLabelText(text);
      const nextNutri = { ...nutri };
      for (const [k, v] of Object.entries(parsed.nutrition)) nextNutri[k as NutriKey] = String(v);
      if (parsed.ingredients) setIngredients(parsed.ingredients);
      setNutri(nextNutri);

      if (!parsed.ingredients && Object.keys(parsed.nutrition).length === 0) {
        setOcrNote('Could not read the label clearly. Try a sharper, well-lit, straight-on photo — or type it in.');
        return;
      }
      // Auto-grade immediately when we have a usable ingredients list.
      if (parsed.ingredients) {
        setOcrNote('Read from your photo — grading now…');
        await runAnalyze(parsed.ingredients, nextNutri, name);
      } else {
        setOcrNote('Read the nutrition panel. Add the ingredients, then grade.');
      }
    } catch (e) {
      setOcrNote((e as Error).message);
    } finally {
      setOcrBusy(false);
    }
  };

  const canSubmit = ingredients.trim().length > 0 && !busy;
  const inputStyle = [
    styles.input,
    { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <ArrowLeft size={22} color={theme.colors.text} />
            </Pressable>
          )}
          <View style={styles.flex}>
            <Text variant="heading">Scan a label</Text>
            <Text variant="caption" muted>
              Snap the ingredients panel — we read and grade it.
            </Text>
          </View>
        </View>

        {ocrSupported ? (
          <View style={[styles.scanCard, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.border }]}>
            {ocrBusy || busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text variant="body">
                  {busy ? 'Grading…' : `Reading label… ${ocrProgress > 0 ? `${Math.round(ocrProgress * 100)}%` : ''}`}
                </Text>
              </View>
            ) : (
              <>
                <Text variant="body" style={styles.scanCopy}>
                  Take a photo of the ingredients / nutrition panel and we’ll read it and grade it automatically.
                </Text>
                <Button
                  label="Scan with camera"
                  variant="primary"
                  fullWidth
                  icon={<Camera size={18} color={theme.colors.onPrimary} />}
                  onPress={() => void scanPhoto()}
                />
              </>
            )}
          </View>
        ) : (
          <View style={[styles.scanCard, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Text variant="caption" muted>
              Photo scanning is available on the web app. Here, enter the label details below.
            </Text>
          </View>
        )}

        {ocrNote && (
          <Text variant="caption" color={theme.colors.primary} style={styles.fieldLabel}>
            {ocrNote}
          </Text>
        )}

        <Text variant="caption" muted style={styles.fieldLabel}>
          Product name (optional)
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Store-brand cookies"
          placeholderTextColor={theme.colors.textMuted}
          style={inputStyle}
          accessibilityLabel="Product name"
        />

        <Text variant="caption" muted style={styles.fieldLabel}>
          Ingredients (comma-separated, as printed)
        </Text>
        <TextInput
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="Wheat flour, sugar, palm oil, raising agent (E500)…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[...inputStyle, styles.multiline]}
          accessibilityLabel="Ingredients list"
        />

        <Text variant="title" style={styles.sectionTitle}>
          Nutrition · per 100g
        </Text>
        <View style={styles.grid}>
          {NUTRI_FIELDS.map((f) => (
            <View key={f.key} style={styles.gridItem}>
              <Text variant="caption" muted style={styles.fieldLabel}>
                {f.label}
              </Text>
              <TextInput
                value={nutri[f.key]}
                onChangeText={(v) => setNutri((s) => ({ ...s, [f.key]: v }))}
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
                style={inputStyle}
                accessibilityLabel={f.label}
              />
            </View>
          ))}
        </View>

        {error && (
          <Text variant="caption" color={theme.colors.error} style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.submit}>
          <Button
            label="Analyse & grade"
            variant="primary"
            fullWidth
            disabled={!canSubmit}
            onPress={() => void runAnalyze(ingredients, nutri, name)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  scanCard: {
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
    shadowColor: '#111111',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  scanCopy: { fontWeight: '600' },
  fieldLabel: { marginTop: spacing.sm, marginBottom: 4 },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
  gridItem: { width: '48%' },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
