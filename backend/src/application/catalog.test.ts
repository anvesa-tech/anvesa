import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MarketplaceService } from './marketplace/MarketplaceService';
import { ProductService } from './product/ProductService';
import type { CachePort } from '../domain/ports/gateways';
import type {
  MarketplaceRepository,
  ProductReadRepository,
  ProductDetailRaw,
} from '../domain/ports/repositories';
import type { ProductCardDTO, GroupKey } from '../domain/catalog/types';

const RUNS = { numRuns: 50 };

const noCache: CachePort = {
  async get() {
    return null;
  },
  async set() {},
  async del() {},
  async hold() {
    return true;
  },
  async release() {},
};

const arbCard: fc.Arbitrary<ProductCardDTO> = fc.record({
  id: fc.uuid(),
  variantId: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  brand: fc.string({ minLength: 1 }),
  grade: fc.constantFrom('A', 'B', 'C', 'D', null),
  priceCents: fc.integer({ min: 0, max: 100000 }),
  mrpCents: fc.integer({ min: 0, max: 100000 }),
  discountCents: fc.integer({ min: 0, max: 100000 }),
  imageUrl: fc.oneof(fc.webUrl(), fc.constant(null)),
});

describe('catalog completeness', () => {
  // Feature: anvesa-marketplace, Property 18: Product card completeness
  it('Property 18: every marketplace card carries image, grade, brand, price, discount', () => {
    fc.assert(
      fc.asyncProperty(fc.array(arbCard, { maxLength: 10 }), async (cards) => {
        const repo: MarketplaceRepository = {
          async listByGroup(_g: GroupKey) {
            return cards;
          },
        };
        const svc = new MarketplaceService(repo, noCache);
        const groups = await svc.getHomeGroups();
        for (const g of groups) {
          for (const c of g.products) {
            expect(c).toHaveProperty('imageUrl');
            expect(c).toHaveProperty('grade');
            expect(typeof c.brand).toBe('string');
            expect(typeof c.priceCents).toBe('number');
            expect(typeof c.discountCents).toBe('number');
          }
        }
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 19: Product detail completeness
  it('Property 19: detail includes all required sections', () => {
    fc.assert(
      fc.asyncProperty(fc.constantFrom<'A' | 'B' | 'C' | 'D'>('A', 'B', 'C', 'D'), async (grade) => {
        const raw: ProductDetailRaw = {
          id: 'p1',
          variantId: 'v1',
          name: 'Test',
          brand: 'BrandX',
          categoryId: 'c1',
          grade,
          priceCents: 10000,
          discountCents: 1000,
          imageUrl: null,
          nutrition: {
            energyKcal: 100,
            sugarG: 2,
            sodiumMg: 30,
            proteinG: 9,
            fatG: 3,
            satFatG: 1,
            fibreG: 7,
          },
          ingredients: ['Oats'],
          reasoning: [{ factor: 'Good fibre', detail: '7g', weight: 8 }],
          redFlags: [],
          reviews: [],
        };
        const repo: ProductReadRepository = {
          async getDetail() {
            return raw;
          },
          async findIdByBarcode() {
            return null;
          },
          async topGraded() {
            return [];
          },
          async betterAlternatives() {
            return [];
          },
        };
        const detail = await new ProductService(repo).getDetail('p1');
        expect(detail).not.toBeNull();
        if (detail) {
          for (const key of [
            'nutrition',
            'ingredients',
            'gradeReasoning',
            'redFlags',
            'betterAlternatives',
            'reviews',
            'gradeExplanation',
          ] as const) {
            expect(detail).toHaveProperty(key);
          }
        }
      }),
      RUNS,
    );
  });
});
