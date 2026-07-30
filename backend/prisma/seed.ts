/**
 * Seed script (Requirement 5.1, 19.1, 22.1).
 *
 * Seeds the nine marketplace categories, brands, vendors, products with
 * nutrition + ingredients + variants, bundles, coupons, delivery slots, and
 * articles. Crucially, grades are NOT hardcoded — every product's grade is
 * computed by the real Grading_Engine via GradingService, proving the
 * composition → engine → persisted grade pipeline end to end.
 */
import { PrismaClient } from '@prisma/client';
import { GradingService } from '../src/application/grading/GradingService';
import { ProductRepositoryPrisma } from '../src/infrastructure/prisma/ProductRepositoryPrisma';
import { AuditRepositoryPrisma } from '../src/infrastructure/prisma/AuditRepositoryPrisma';

const db = new PrismaClient();

interface SeedProduct {
  name: string;
  brand: string;
  priceCents: number;
  discountCents: number;
  nutrition: {
    energyKcal: number;
    sugarG: number;
    sodiumMg: number;
    proteinG: number;
    fatG: number;
    satFatG: number;
    fibreG: number;
  };
  ingredients: { name: string; isAdditive?: boolean; isAllergen?: boolean }[];
}

const CATEGORIES: { key: string; name: string; products: SeedProduct[] }[] = [
  {
    key: 'breakfast',
    name: 'Breakfast',
    products: [
      {
        name: 'Steel-Cut Oats 1kg',
        brand: 'True Elements',
        priceCents: 21000,
        discountCents: 5000,
        nutrition: { energyKcal: 379, sugarG: 1, sodiumMg: 6, proteinG: 13, fatG: 6.5, satFatG: 1.2, fibreG: 10 },
        ingredients: [{ name: 'Whole grain oats' }],
      },
      {
        name: 'Honey Corn Pops',
        brand: 'Generic Foods',
        priceCents: 24000,
        discountCents: 0,
        nutrition: { energyKcal: 480, sugarG: 34, sodiumMg: 620, proteinG: 4, fatG: 9, satFatG: 6, fibreG: 1 },
        ingredients: [
          { name: 'Refined corn' },
          { name: 'Sugar' },
          { name: 'Invert syrup' },
          { name: 'Artificial flavor', isAdditive: true },
          { name: 'INS 150d', isAdditive: true },
        ],
      },
    ],
  },
  {
    key: 'snacks',
    name: 'Snacks',
    products: [
      {
        name: 'Roasted Makhana',
        brand: 'Farmley',
        priceCents: 19900,
        discountCents: 5000,
        nutrition: { energyKcal: 347, sugarG: 0, sodiumMg: 40, proteinG: 9.7, fatG: 1.9, satFatG: 0.1, fibreG: 14.5 },
        ingredients: [{ name: 'Foxnuts' }, { name: 'Rock salt' }],
      },
      {
        name: 'Classic Potato Chips',
        brand: 'Generic Foods',
        priceCents: 4000,
        discountCents: 0,
        nutrition: { energyKcal: 536, sugarG: 0.3, sodiumMg: 525, proteinG: 6, fatG: 35, satFatG: 11, fibreG: 4 },
        ingredients: [
          { name: 'Potato' },
          { name: 'Palm oil' },
          { name: 'Flavour enhancer INS 621', isAdditive: true },
        ],
      },
    ],
  },
  {
    key: 'beverages',
    name: 'Beverages',
    products: [
      {
        name: 'Green Tea 25s',
        brand: 'Vahdam',
        priceCents: 28000,
        discountCents: 7000,
        nutrition: { energyKcal: 1, sugarG: 0, sodiumMg: 2, proteinG: 0, fatG: 0, satFatG: 0, fibreG: 0 },
        ingredients: [{ name: 'Green tea leaves' }],
      },
      {
        name: 'Cola 750ml',
        brand: 'Generic Beverages',
        priceCents: 4500,
        discountCents: 0,
        nutrition: { energyKcal: 42, sugarG: 10.6, sodiumMg: 12, proteinG: 0, fatG: 0, satFatG: 0, fibreG: 0 },
        ingredients: [
          { name: 'Carbonated water' },
          { name: 'Sugar' },
          { name: 'Caramel colour INS 150d', isAdditive: true },
          { name: 'Phosphoric acid', isAdditive: true },
        ],
      },
    ],
  },
  {
    key: 'staples',
    name: 'Staples',
    products: [
      {
        name: 'Unpolished Toor Dal',
        brand: 'Tata Sampann',
        priceCents: 17500,
        discountCents: 2400,
        nutrition: { energyKcal: 343, sugarG: 1.5, sodiumMg: 17, proteinG: 22, fatG: 1.5, satFatG: 0.4, fibreG: 15 },
        ingredients: [{ name: 'Pigeon pea' }],
      },
    ],
  },
  {
    key: 'kids',
    name: 'Kids',
    products: [
      {
        name: 'Ragi Cookies',
        brand: 'Timios',
        priceCents: 11000,
        discountCents: 2000,
        nutrition: { energyKcal: 420, sugarG: 12, sodiumMg: 140, proteinG: 7, fatG: 14, satFatG: 4, fibreG: 6 },
        ingredients: [{ name: 'Ragi flour' }, { name: 'Jaggery' }, { name: 'Butter' }],
      },
    ],
  },
  {
    key: 'protein',
    name: 'Protein',
    products: [
      {
        name: 'Protein Chips',
        brand: 'The Whole Truth',
        priceCents: 12000,
        discountCents: 2000,
        nutrition: { energyKcal: 380, sugarG: 2, sodiumMg: 300, proteinG: 20, fatG: 12, satFatG: 2, fibreG: 8 },
        ingredients: [{ name: 'Soy protein' }, { name: 'Rice' }, { name: 'Sunflower oil' }],
      },
    ],
  },
  {
    key: 'organic',
    name: 'Organic',
    products: [
      {
        name: 'Organic Quinoa',
        brand: 'Nourish You',
        priceCents: 34000,
        discountCents: 5900,
        nutrition: { energyKcal: 368, sugarG: 0, sodiumMg: 5, proteinG: 14, fatG: 6, satFatG: 0.7, fibreG: 7 },
        ingredients: [{ name: 'Organic quinoa' }],
      },
    ],
  },
  {
    key: 'dairy',
    name: 'Dairy',
    products: [
      {
        name: 'A2 Cow Milk 1L',
        brand: 'Akshayakalpa',
        priceCents: 9000,
        discountCents: 900,
        nutrition: { energyKcal: 62, sugarG: 4.8, sodiumMg: 43, proteinG: 3.3, fatG: 3.5, satFatG: 2, fibreG: 0 },
        ingredients: [{ name: 'A2 cow milk' }],
      },
    ],
  },
  {
    key: 'healthy-alternatives',
    name: 'Healthy Alternatives',
    products: [
      {
        name: 'Almond Flour',
        brand: 'Urban Platter',
        priceCents: 48000,
        discountCents: 7000,
        nutrition: { energyKcal: 571, sugarG: 4, sodiumMg: 1, proteinG: 21, fatG: 50, satFatG: 3.8, fibreG: 11 },
        ingredients: [{ name: 'Blanched almonds' }],
      },
    ],
  },
];

async function reset() {
  // Delete in dependency order so the seed is re-runnable.
  await db.payment.deleteMany();
  await db.orderStatusEvent.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.subscriptionItem.deleteMany();
  await db.subscription.deleteMany();
  await db.gradeReasoning.deleteMany();
  await db.productGrade.deleteMany();
  await db.productFlag.deleteMany();
  await db.bundleProduct.deleteMany();
  await db.bundle.deleteMany();
  await db.ingredient.deleteMany();
  await db.nutrition.deleteMany();
  await db.productImage.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.deliverySlot.deleteMany();
  await db.newsletterArticle.deleteMany();
}

async function main() {
  console.warn('Seeding ANVESA catalog...');
  await reset();

  const vendor = await db.vendor.upsert({
    where: { id: 'seed-vendor' },
    update: {},
    create: { id: 'seed-vendor', name: 'ANVESA Verified Supply', isActive: true },
  });

  const grading = new GradingService(
    new ProductRepositoryPrisma(db),
    new AuditRepositoryPrisma(db),
  );

  const productIds: string[] = [];

  for (const cat of CATEGORIES) {
    const category = await db.category.upsert({
      where: { key: cat.key },
      update: { name: cat.name },
      create: { key: cat.key, name: cat.name },
    });

    for (const p of cat.products) {
      const brand = await db.brand.upsert({
        where: { name: p.brand },
        update: {},
        create: { name: p.brand },
      });

      // Deterministic EAN-13-style barcode (India prefix 890) per product so
      // the scanner resolves to a real catalog product.
      const barcode = `890${String(productIds.length + 1).padStart(10, '0')}`;
      const product = await db.product.create({
        data: {
          name: p.name,
          barcode,
          categoryId: category.id,
          brandId: brand.id,
          vendorId: vendor.id,
          isListed: true,
          nutrition: { create: p.nutrition },
          ingredients: {
            create: p.ingredients.map((i) => ({
              name: i.name,
              isAdditive: i.isAdditive ?? false,
              isAllergen: i.isAllergen ?? false,
            })),
          },
          variants: {
            create: {
              label: 'Standard',
              priceCents: p.priceCents,
              discountCents: p.discountCents,
              stock: 100,
            },
          },
          images: { create: { url: 'placeholder', position: 0 } },
        },
      });
      productIds.push(product.id);
    }
  }

  // Compute grades via the real Grading_Engine for every seeded product.
  const graded: { name: string; grade: string | null; barcode: string | null }[] = [];
  for (const id of productIds) {
    const grade = await grading.recomputeFor(id);
    const prod = await db.product.findUnique({
      where: { id },
      select: { name: true, barcode: true },
    });
    graded.push({ name: prod?.name ?? id, grade, barcode: prod?.barcode ?? null });
  }

  // Coupons
  await db.coupon.upsert({
    where: { code: 'CLEAN10' },
    update: {},
    create: {
      code: 'CLEAN10',
      type: 'PERCENT',
      value: 10,
      minOrderCents: 20000,
      usageLimit: 1000,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    },
  });

  // Delivery slots for the next 7 days (2 per day)
  for (let d = 0; d < 7; d += 1) {
    for (const hour of [10, 18]) {
      const start = new Date();
      start.setDate(start.getDate() + d);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 1000 * 60 * 60 * 2);
      await db.deliverySlot.create({ data: { startAt: start, endAt: end, capacity: 20 } });
    }
  }

  // Functional bundles (multi-brand) — Requirement 22.1. Attach a few graded
  // products to each bundle by picking high-grade products.
  const highGrade = await db.productGrade.findMany({
    where: { grade: 'A' },
    select: { productId: true },
    take: 6,
  });
  const bundleDefs = [
    { key: 'weight-loss', name: 'Weight Loss', priceCents: 79900 },
    { key: 'high-protein', name: 'High Protein', priceCents: 99900 },
    { key: 'kids-nutrition', name: 'Kids Nutrition', priceCents: 59900 },
    { key: 'gut-friendly', name: 'Gut Friendly', priceCents: 69900 },
    { key: 'diabetic', name: 'Diabetic', priceCents: 74900 },
    { key: 'heart-health', name: 'Heart Health', priceCents: 84900 },
  ];
  for (const b of bundleDefs) {
    const bundle = await db.bundle.create({
      data: { key: b.key, name: b.name, priceCents: b.priceCents },
    });
    for (const g of highGrade.slice(0, 3)) {
      await db.bundleProduct.create({
        data: { bundleId: bundle.id, productId: g.productId },
      });
    }
  }

  // Newsletter articles — Requirement 25.1.
  await db.newsletterArticle.createMany({
    data: [
      { title: 'How ANVESA grades your food', body: 'Grades come only from composition — never from ads or brand deals.' },
      { title: 'Reading a nutrition label like a pro', body: 'Sugar, sodium, and additives are the three to watch.' },
      { title: 'Swapping to better staples', body: 'Small swaps across breakfast and snacks add up fast.' },
    ],
  });

  console.warn('\nComputed grades (by the Grading_Engine):');
  for (const g of graded) console.warn(`  ${g.grade}  ${g.barcode}  ${g.name}`);
  console.warn(
    `\nSeeded ${productIds.length} products across ${CATEGORIES.length} categories, ${bundleDefs.length} bundles, 3 articles.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
