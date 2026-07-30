import { computeGrade } from '../../domain/grading/computeGrade';
import { parseLabelToInput } from '../../domain/grading/parseLabel';
import type { Grade, NutritionFacts } from '../../domain/grading/types';
import type {
  GradeFactorDTO,
  NutritionRowDTO,
  ProductDetailDTO,
} from '../../domain/catalog/detail';
import type { ProductReadRepository, ProductDetailRaw } from '../../domain/ports/repositories';
import type { ExternalProductData, ProductDataGateway } from '../../domain/ports/gateways';

export type ScanResult =
  | { found: true; product: ProductDetailDTO }
  | { found: false };

const GRADE_RANK: Record<Grade, number> = { A: 3, B: 2, C: 1, D: 0 };

const GRADE_EXPLANATION: Record<Grade, string> = {
  A: 'Excellent. Clean ingredients, strong nutrition, no significant red flags.',
  B: 'Good. A solid choice with only minor concerns worth noting.',
  C: 'Average. Some nutritional concerns — check the red flags below.',
  D: 'Poor. High in concerning nutrients or heavily processed additives.',
};

function higherGrades(grade: Grade): Grade[] {
  const rank = GRADE_RANK[grade];
  return (['A', 'B', 'C', 'D'] as Grade[]).filter((g) => GRADE_RANK[g] > rank);
}

function nutritionRows(n: NonNullable<ProductDetailRaw['nutrition']>): NutritionRowDTO[] {
  const tone = (bad: boolean, good: boolean): NutritionRowDTO['tone'] =>
    bad ? 'bad' : good ? 'good' : 'neutral';
  return [
    { label: 'Energy', value: `${Math.round(n.energyKcal)} kcal`, tone: 'neutral' },
    { label: 'Sugar', value: `${n.sugarG} g`, tone: tone(n.sugarG >= 22.5, n.sugarG <= 5) },
    { label: 'Sodium', value: `${n.sodiumMg} mg`, tone: tone(n.sodiumMg >= 600, n.sodiumMg <= 120) },
    { label: 'Protein', value: `${n.proteinG} g`, tone: tone(false, n.proteinG >= 8) },
    { label: 'Fibre', value: `${n.fibreG} g`, tone: tone(false, n.fibreG >= 6) },
    {
      label: 'Saturated Fat',
      value: `${n.satFatG} g`,
      tone: tone(n.satFatG >= 5, n.satFatG <= 1.5),
    },
  ];
}

function factorTone(weight: number): GradeFactorDTO['tone'] {
  if (weight > 0) return 'good';
  if (weight < 0) return 'bad';
  return 'neutral';
}

function flagSeverity(s: string): 'low' | 'medium' | 'high' {
  return s === 'high' || s === 'medium' || s === 'low' ? s : 'medium';
}

/**
 * Product_Service detail (Requirement 8.1-8.4). Assembles the detail DTO from
 * persisted composition, the engine-computed grade + reasoning, red flags,
 * reviews, and same-category higher-graded better alternatives.
 */
export class ProductService {
  constructor(
    private readonly repo: ProductReadRepository,
    private readonly externalData?: ProductDataGateway,
  ) {}

  /** Look up a product's detail from a scanned barcode (Requirement 10.1). */
  async lookupByBarcode(barcode: string): Promise<ProductDetailDTO | null> {
    const id = await this.repo.findIdByBarcode(barcode);
    if (!id) return null;
    return this.getDetail(id);
  }

  /**
   * Scan a barcode (Requirement 10). First checks the ANVESA catalog; if not
   * found, resolves composition from Open Food Facts and grades it with our own
   * Grading_Engine, suggesting in-catalog alternatives + an Amazon fallback.
   */
  async scanBarcode(barcode: string): Promise<ScanResult> {
    const id = await this.repo.findIdByBarcode(barcode);
    if (id) {
      const detail = await this.getDetail(id);
      return detail ? { found: true, product: detail } : { found: false };
    }
    if (!this.externalData) return { found: false };
    const external = await this.externalData.lookupByBarcode(barcode);
    if (!external) return { found: false };
    const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(`${external.brand} ${external.name}`)}&tag=anvesa-21`;
    return {
      found: true,
      product: await this.buildExternalDetail(external, `off:${barcode}`, amazonUrl),
    };
  }

  /**
   * Analyse a food label (Requirement 10). Parses raw ingredient text + the
   * nutrition panel into a GradingInput and grades it with our own engine, so
   * products with no barcode match can still be objectively graded.
   */
  async analyzeLabel(input: {
    name?: string | undefined;
    brand?: string | undefined;
    ingredientsText: string;
    nutrition: NutritionFacts;
  }): Promise<ProductDetailDTO> {
    const gradingInput = parseLabelToInput(input.ingredientsText, input.nutrition);
    const name = input.name?.trim() || 'Scanned label';
    const brand = input.brand?.trim() || 'Unknown brand';
    const external: ExternalProductData = {
      name,
      brand,
      imageUrl: null,
      input: gradingInput,
    };
    const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(`${brand} ${name}`)}&tag=anvesa-21`;
    return this.buildExternalDetail(external, `label:${Date.now()}`, amazonUrl);
  }

  private async buildExternalDetail(
    data: ExternalProductData,
    id: string,
    amazonUrl: string | null,
  ): Promise<ProductDetailDTO> {
    const result = computeGrade(data.input);
    // Suggest up to three higher-graded ANVESA products as better options.
    const better = (await this.repo.topGraded(3)).filter((p) => p.grade && p.grade < result.grade);
    return {
      id,
      variantId: null,
      name: data.name,
      brand: data.brand,
      grade: result.grade,
      priceCents: 0,
      mrpCents: 0,
      discountCents: 0,
      imageUrl: data.imageUrl,
      gradeExplanation: GRADE_EXPLANATION[result.grade],
      nutrition: nutritionRows(data.input.nutrition),
      ingredients: data.input.ingredients.map((i) => i.name),
      gradeReasoning: result.reasoning.map((r) => ({
        factor: r.factor,
        detail: r.detail,
        tone: factorTone(r.weight),
      })),
      redFlags: result.redFlags.map((f) => ({
        title: f.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        note: f.note,
        severity: flagSeverity(f.severity),
      })),
      betterAlternatives: better,
      reviews: [],
      source: 'external',
      amazonUrl,
    };
  }

  async getDetail(productId: string): Promise<ProductDetailDTO | null> {
    const raw = await this.repo.getDetail(productId);
    if (!raw) return null;

    const betterAlternatives = raw.grade
      ? await this.repo.betterAlternatives(raw.categoryId, higherGrades(raw.grade), raw.id, 3)
      : [];

    return {
      id: raw.id,
      variantId: raw.variantId,
      name: raw.name,
      brand: raw.brand,
      grade: raw.grade,
      priceCents: raw.priceCents,
      mrpCents: raw.priceCents + raw.discountCents,
      discountCents: raw.discountCents,
      imageUrl: raw.imageUrl,
      gradeExplanation: raw.grade ? GRADE_EXPLANATION[raw.grade] : 'Not yet graded.',
      nutrition: raw.nutrition ? nutritionRows(raw.nutrition) : [],
      ingredients: raw.ingredients,
      gradeReasoning: raw.reasoning.map((r) => ({
        factor: r.factor,
        detail: r.detail,
        tone: factorTone(r.weight),
      })),
      redFlags: raw.redFlags.map((f) => ({
        title: f.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        note: f.note,
        severity: flagSeverity(f.severity),
      })),
      betterAlternatives,
      reviews: raw.reviews,
      source: 'anvesa',
      amazonUrl: null,
    };
  }
}
