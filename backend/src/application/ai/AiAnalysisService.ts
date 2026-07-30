import type { AiGateway } from '../../domain/ports/gateways';
import type { IngredientRef, NutritionFacts } from '../../domain/grading/types';

export interface HealthProfileContext {
  conditions: string[];
  goals: string[];
}

export type AnalysisResult =
  | { available: true; ingredientAnalysis: string; healthSummary: string }
  | { available: false; reason: 'unavailable' };

const AI_TIMEOUT_MS = 10_000;

/**
 * AI_Analysis_Service (Requirement 11). Generates plain-language ingredient
 * analysis + health summary via the Claude gateway with a 10s timeout. On
 * error/timeout it degrades gracefully to "unavailable".
 *
 * By construction this service has NO write path to the product Grade — it
 * receives composition and returns text only, so it can never alter a grade
 * (Requirement 11.4).
 */
export class AiAnalysisService {
  constructor(private readonly gateway: AiGateway) {}

  async analyze(
    ingredients: IngredientRef[],
    nutrition: NutritionFacts,
    profile?: HealthProfileContext,
  ): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(ingredients, nutrition, profile);
    try {
      const text = await this.gateway.analyze(prompt, AI_TIMEOUT_MS);
      const [ingredientAnalysis, healthSummary] = this.split(text);
      return { available: true, ingredientAnalysis, healthSummary };
    } catch {
      return { available: false, reason: 'unavailable' };
    }
  }

  private buildPrompt(
    ingredients: IngredientRef[],
    nutrition: NutritionFacts,
    profile?: HealthProfileContext,
  ): string {
    const ing = ingredients.map((i) => i.name).join(', ');
    const health = profile
      ? ` Consider conditions: ${profile.conditions.join(', ')}; goals: ${profile.goals.join(', ')}.`
      : '';
    return `Analyze these ingredients: ${ing}. Nutrition per 100g: ${JSON.stringify(nutrition)}.${health}`;
  }

  private split(text: string): [string, string] {
    const parts = text.split('\n\n');
    return [parts[0] ?? text, parts[1] ?? ''];
  }
}
