import type { Grade, ProductCardModel, ProductGroup } from '@/domain/product';

/**
 * Mock marketplace catalog used while the backend Marketplace_Service is wired.
 * Structure matches the nine product groups from Requirement 5.1.
 * Replace with tRPC `marketplace.getHomeGroups` once the backend is live.
 */

const tints = ['#EADDFF', '#DFF5E6', '#FFE9D6', '#DDEBFF', '#FDE2F3', '#E8F0D6', '#FFF0CC'];

let idc = 0;
function p(
  name: string,
  brand: string,
  grade: Grade,
  price: number,
  mrp: number,
): ProductCardModel {
  const tint = tints[idc % tints.length] ?? '#EADDFF';
  idc += 1;
  return {
    id: `p_${idc}`,
    variantId: null,
    name,
    brand,
    grade,
    priceCents: price * 100,
    mrpCents: mrp * 100,
    imageColor: tint,
  };
}

export const MOCK_GROUPS: ProductGroup[] = [
  {
    key: 'breakfast',
    title: 'Breakfast',
    products: [
      p('Steel-Cut Oats 1kg', 'True Elements', 'A', 210, 260),
      p('No-Sugar Muesli', 'Yogabar', 'B', 320, 399),
      p('Multigrain Flakes', 'Soulfull', 'B', 180, 220),
      p('Honey Corn Pops', 'Kellogg’s', 'D', 240, 240),
    ],
  },
  {
    key: 'snacks',
    title: 'Snacks',
    products: [
      p('Roasted Makhana', 'Farmley', 'A', 199, 249),
      p('Baked Ragi Chips', 'Open Secret', 'B', 99, 120),
      p('Peanut Butter Bar', 'The Whole Truth', 'A', 60, 70),
      p('Classic Potato Chips', 'Lay’s', 'D', 40, 40),
    ],
  },
  {
    key: 'beverages',
    title: 'Beverages',
    products: [
      p('Cold Pressed Orange', 'Raw Pressery', 'B', 130, 150),
      p('Green Tea 25s', 'Vahdam', 'A', 280, 350),
      p('Sparkling Water', 'Bonaqua', 'A', 90, 90),
      p('Cola 750ml', 'Coca-Cola', 'D', 45, 45),
    ],
  },
  {
    key: 'staples',
    title: 'Staples',
    products: [
      p('Unpolished Toor Dal', 'Tata Sampann', 'A', 175, 199),
      p('Brown Basmati Rice', '24 Mantra', 'A', 220, 260),
      p('Cold-Pressed Mustard Oil', 'Dhara', 'B', 240, 280),
      p('Refined Palm Oil', 'Fortune', 'C', 140, 160),
    ],
  },
  {
    key: 'kids',
    title: 'Kids',
    products: [
      p('Fruit & Nut Bar', 'Slurrp Farm', 'A', 55, 65),
      p('Ragi Cookies', 'Timios', 'B', 110, 130),
      p('Choco Filled Rolls', 'Pillsbury', 'D', 90, 90),
      p('Millet Puffs', 'Gooddiet', 'A', 85, 99),
    ],
  },
  {
    key: 'protein',
    title: 'Protein',
    products: [
      p('Whey Isolate 1kg', 'MyProtein', 'B', 2499, 2999),
      p('Plant Protein', 'OZiva', 'B', 1499, 1799),
      p('Protein Chips', 'The Whole Truth', 'A', 120, 140),
      p('Mass Gainer', 'Generic', 'D', 999, 1199),
    ],
  },
  {
    key: 'organic',
    title: 'Organic',
    products: [
      p('Organic Jaggery', '24 Mantra', 'A', 95, 110),
      p('Organic Quinoa', 'Nourish You', 'A', 340, 399),
      p('Organic Honey', 'Under The Mango Tree', 'B', 420, 480),
      p('Organic Ghee', 'Two Brothers', 'A', 899, 999),
    ],
  },
  {
    key: 'dairy',
    title: 'Dairy',
    products: [
      p('A2 Cow Milk 1L', 'Akshayakalpa', 'A', 90, 99),
      p('Greek Yogurt', 'Epigamia', 'B', 60, 70),
      p('Paneer 200g', 'Milky Mist', 'A', 95, 110),
      p('Processed Cheese Slices', 'Generic', 'C', 130, 150),
    ],
  },
  {
    key: 'healthy-alternatives',
    title: 'Healthy Alternatives',
    products: [
      p('Almond Flour', 'Urban Platter', 'A', 480, 550),
      p('Jaggery Dark Chocolate', 'Pascati', 'B', 210, 250),
      p('Zero-Maida Pasta', 'The Whole Truth', 'A', 180, 210),
      p('Stevia Sweetener', 'Zevic', 'B', 240, 280),
    ],
  },
];
