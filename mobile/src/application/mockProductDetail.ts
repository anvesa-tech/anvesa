import { MOCK_GROUPS } from './mockCatalog';
import type { Grade, ProductCardModel } from '@/domain/product';
import type { ProductDetailModel } from '@/domain/productDetail';

const GRADE_RANK: Record<Grade, number> = { A: 3, B: 2, C: 1, D: 0 };

const GRADE_EXPLANATION: Record<Grade, string> = {
  A: 'Excellent. Clean ingredients, strong nutrition, no significant red flags.',
  B: 'Good. A solid choice with only minor concerns worth noting.',
  C: 'Average. Some nutritional concerns — check the red flags below.',
  D: 'Poor. High in concerning nutrients or heavily processed additives.',
};

function findCard(id: string): { card: ProductCardModel; groupKey: string } | null {
  for (const g of MOCK_GROUPS) {
    const card = g.products.find((p) => p.id === id);
    if (card) return { card, groupKey: g.key };
  }
  return null;
}

function nutritionFor(grade: Grade) {
  // Synthetic per-100g values that trend with the grade, for a believable panel.
  const bad = grade === 'D' || grade === 'C';
  return [
    { label: 'Energy', value: bad ? '486 kcal' : '312 kcal', tone: 'neutral' as const },
    {
      label: 'Sugar',
      value: bad ? '22 g' : grade === 'A' ? '1.2 g' : '6 g',
      tone: bad ? ('bad' as const) : ('good' as const),
    },
    {
      label: 'Sodium',
      value: bad ? '640 mg' : '95 mg',
      tone: bad ? ('bad' as const) : ('good' as const),
    },
    {
      label: 'Protein',
      value: grade === 'A' ? '14 g' : grade === 'B' ? '9 g' : '4 g',
      tone: grade === 'D' ? ('neutral' as const) : ('good' as const),
    },
    { label: 'Fibre', value: grade === 'A' ? '8 g' : '3 g', tone: 'good' as const },
    {
      label: 'Saturated Fat',
      value: bad ? '9 g' : '1.5 g',
      tone: bad ? ('bad' as const) : ('good' as const),
    },
  ];
}

function reasoningFor(grade: Grade) {
  const base = [
    {
      factor: 'Whole-food ingredients',
      detail:
        grade === 'A' || grade === 'B'
          ? 'Made largely from recognizable whole ingredients.'
          : 'Contains refined and processed components.',
      tone: grade === 'A' || grade === 'B' ? ('good' as const) : ('bad' as const),
    },
    {
      factor: 'Added sugar',
      detail:
        grade === 'A'
          ? 'No added sugar detected.'
          : grade === 'D'
            ? 'High added sugar per serving.'
            : 'Moderate added sugar.',
      tone: grade === 'A' ? ('good' as const) : grade === 'D' ? ('bad' as const) : ('neutral' as const),
    },
    {
      factor: 'Additives',
      detail:
        grade === 'D'
          ? 'Includes artificial flavors and preservatives.'
          : 'Free from artificial additives.',
      tone: grade === 'D' ? ('bad' as const) : ('good' as const),
    },
  ];
  return base;
}

function redFlagsFor(grade: Grade) {
  if (grade === 'A') return [];
  if (grade === 'B')
    return [
      {
        title: 'Contains palm oil',
        note: 'Sustainably sourced, but a saturated-fat source.',
        severity: 'low' as const,
      },
    ];
  if (grade === 'C')
    return [
      {
        title: 'Refined oils',
        note: 'Uses refined vegetable oil high in omega-6.',
        severity: 'medium' as const,
      },
    ];
  return [
    { title: 'High added sugar', note: '22g per 100g — above recommended limits.', severity: 'high' as const },
    { title: 'High sodium', note: '640mg per 100g contributes to daily excess.', severity: 'high' as const },
    { title: 'Artificial additives', note: 'Contains synthetic colors and flavor enhancers.', severity: 'medium' as const },
  ];
}

/**
 * Synthesizes a full product detail from the mock catalog.
 * Better alternatives are same-group products with a strictly higher grade,
 * ordered highest-to-lowest (mirrors Requirement 8.4 / Property 20).
 */
export function getMockDetail(id: string): ProductDetailModel | null {
  const found = findCard(id);
  if (!found) return null;
  const { card, groupKey } = found;

  const group = MOCK_GROUPS.find((g) => g.key === groupKey);
  const betterAlternatives = (group?.products ?? [])
    .filter((p) => p.id !== card.id && GRADE_RANK[p.grade] > GRADE_RANK[card.grade])
    .sort((a, b) => GRADE_RANK[b.grade] - GRADE_RANK[a.grade])
    .slice(0, 3);

  const reviews: ProductDetailModel['reviews'] =
    card.grade === 'A' || card.grade === 'B'
      ? [
          { id: 'r1', author: 'Aarav', rating: 5, text: 'Clean label and genuinely tastes great.' },
          { id: 'r2', author: 'Meera', rating: 4, text: 'Good staple, will reorder.' },
        ]
      : [];

  return {
    id: card.id,
    variantId: card.variantId,
    name: card.name,
    brand: card.brand,
    grade: card.grade,
    priceCents: card.priceCents,
    mrpCents: card.mrpCents,
    imageColor: card.imageColor,
    gradeExplanation: GRADE_EXPLANATION[card.grade],
    nutrition: nutritionFor(card.grade),
    ingredients:
      card.grade === 'D'
        ? ['Refined wheat flour', 'Sugar', 'Palm oil', 'Invert syrup', 'Salt', 'Artificial flavor', 'INS 500(ii)']
        : ['Whole grain', 'Nuts', 'Cold-pressed oil', 'Sea salt', 'Natural flavor'],
    gradeReasoning: reasoningFor(card.grade),
    redFlags: redFlagsFor(card.grade),
    betterAlternatives,
    reviews,
  };
}
