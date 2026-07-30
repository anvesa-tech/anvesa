/**
 * Repository ports (Requirement 31.3, 31.4).
 *
 * These interfaces are declared by the domain and implemented by the
 * infrastructure layer (Prisma adapters). Application services depend only on
 * these ports, never on Prisma directly, which keeps the domain persistence-
 * agnostic and unit-testable with fakes.
 */
import type { Grade, GradingInput } from '../grading/types';

export interface ProductCompositionRecord {
  productId: string;
  input: GradingInput;
}

export interface GradeRecord {
  productId: string;
  grade: Grade;
  inputHash: string;
  reasoning: { factor: string; weight: number; detail: string }[];
  redFlags: { type: string; severity: string; note: string }[];
}

export interface ProductRepository {
  getComposition(productId: string): Promise<ProductCompositionRecord | null>;
  persistGrade(record: GradeRecord): Promise<void>;
  getGrade(productId: string): Promise<Grade | null>;
}

export interface AuditRepository {
  record(entry: {
    actorId: string | null;
    action: string;
    attempted?: unknown;
  }): Promise<void>;
}

export interface CartLineView {
  itemId: string;
  variantId: string;
  productName: string;
  priceCents: number;
  qty: number;
  stock: number;
}

export interface CartView {
  ownerId: string;
  lines: CartLineView[];
  subtotalCents: number;
}

export interface CartRepository {
  getCart(ownerId: string): Promise<CartView>;
  /** Current stock for a variant, or null if it does not exist. */
  getVariantStock(variantId: string): Promise<number | null>;
  /** Upsert a cart line, setting (not incrementing) its quantity. */
  upsertItem(ownerId: string, variantId: string, qty: number, isGuest: boolean): Promise<void>;
  /** Increment a cart line quantity by delta (creating it if absent). */
  incrementItem(ownerId: string, variantId: string, delta: number, isGuest: boolean): Promise<void>;
  removeItem(ownerId: string, itemId: string): Promise<void>;
  clear(ownerId: string): Promise<void>;
  /** In-stock variant ids for a bundle's products (cheapest variant each). */
  bundleInStockVariants(bundleId: string): Promise<string[]>;
}

export interface WalletRepository {
  getBalance(userId: string): Promise<number>;
  applyDebit(userId: string, amountCents: number, reason: string): Promise<void>;
  applyCredit(
    userId: string,
    amountCents: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<void>;
}

export interface CouponRepository {
  findByCode(code: string): Promise<{
    code: string;
    type: 'PERCENT' | 'FLAT';
    value: number;
    minOrderCents: number;
    usageLimit: number;
    usedCount: number;
    expiresAt: Date;
    isActive: boolean;
  } | null>;
  incrementUsage(code: string): Promise<void>;
}

export interface OrderItemInput {
  variantId: string;
  qty: number;
  priceCents: number;
}

export interface CreateOrderInput {
  userId: string;
  items: OrderItemInput[];
  subtotalCents: number;
  discountCents: number;
  walletCents: number;
  deliveryCents: number;
  totalCents: number;
  addressId: string;
  slotId: string | null;
}

export interface OrderRecord {
  id: string;
  userId: string;
  status: string;
  totalCents: number;
  addressId: string;
  slotId: string | null;
  items: OrderItemInput[];
  createdAt: Date;
}

export interface OrderStatusEventRecord {
  status: string;
  at: Date;
}

export interface PaymentRepository {
  record(payment: {
    orderId: string | null;
    amountCents: number;
    status: 'CREATED' | 'SUCCESS' | 'FAILED';
    razorpayRef: string | null;
    signature: string | null;
  }): Promise<void>;
}

/** Resolves the owner of a delivery address, for checkout ownership checks. */
export interface AddressRepository {
  /** The user id that owns this address, or null if the address is unknown. */
  ownerOf(addressId: string): Promise<string | null>;
}

export interface OrderRepository {
  create(order: CreateOrderInput): Promise<OrderRecord>;
  appendStatus(orderId: string, status: string, at: Date): Promise<void>;
  getById(orderId: string): Promise<OrderRecord | null>;
  getHistory(orderId: string): Promise<OrderStatusEventRecord[]>;
  listByUser(userId: string): Promise<OrderRecord[]>;
}

import type { GroupKey, ProductCardDTO } from '../catalog/types';

export interface MarketplaceRepository {
  /** Products for a group, excluding inactive-vendor products (R28.5). */
  listByGroup(group: GroupKey, limit: number, cursor?: string): Promise<ProductCardDTO[]>;
}

export interface ProductDetailRaw {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  categoryId: string;
  grade: Grade | null;
  priceCents: number;
  discountCents: number;
  imageUrl: string | null;
  nutrition: {
    energyKcal: number;
    sugarG: number;
    sodiumMg: number;
    proteinG: number;
    fatG: number;
    satFatG: number;
    fibreG: number;
  } | null;
  ingredients: string[];
  reasoning: { factor: string; detail: string; weight: number }[];
  redFlags: { type: string; severity: string; note: string }[];
  reviews: { id: string; author: string; rating: number; text: string }[];
}

export interface SearchableProductRow {
  card: ProductCardDTO;
  filterable: import('../catalog/filters').FilterableProduct;
}

export interface SearchRepository {
  /** Candidate products for search, with nutrition + ingredients for filtering. */
  listSearchable(limit: number): Promise<SearchableProductRow[]>;
}

export interface ProductReadRepository {
  getDetail(productId: string): Promise<ProductDetailRaw | null>;
  /** Resolve a product id from a scanned barcode (Requirement 10.1). */
  findIdByBarcode(barcode: string): Promise<string | null>;
  /** Highest-graded catalog products, for suggesting alternatives to a scan. */
  topGraded(limit: number): Promise<ProductCardDTO[]>;
  /** Same-category products whose grade is in `higherGrades`, best first. */
  betterAlternatives(
    categoryId: string,
    higherGrades: Grade[],
    excludeId: string,
    limit: number,
  ): Promise<ProductCardDTO[]>;
}

export interface RewardsRepository {
  hasScanReward(userId: string, productId: string, utcDay: string): Promise<boolean>;
  recordScanReward(userId: string, productId: string, utcDay: string, xp: number): Promise<void>;
  addXp(userId: string, xp: number): Promise<void>;
  grantBadgeOnce(userId: string, key: string): Promise<boolean>;
  getStreak(userId: string): Promise<{ scanStreak: number; lastScanDay: string | null } | null>;
  setScanStreak(userId: string, streak: number, day: string): Promise<void>;
}
