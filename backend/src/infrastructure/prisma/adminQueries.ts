/**
 * Admin back-office queries (Requirement 27). A pragmatic, DB-heavy data layer
 * for the internal admin surface. Reads and CRUD live here; product grades are
 * NEVER written here — grading always goes through GradingService, preserving
 * the integrity guarantee (Requirement 12).
 */
import { prisma } from './client';
import { parseIngredients } from '../../domain/grading/parseLabel';

export interface DashboardStats {
  products: number;
  listedProducts: number;
  orders: number;
  pendingOrders: number;
  customers: number;
  revenueCents: number;
  totalXp: number;
  lowStock: number;
}

const OPEN_STATUSES = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'] as const;

export async function getDashboardStats(): Promise<DashboardStats> {
  const [products, listedProducts, orders, pendingOrders, customers, revenue, xp, lowStock] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isListed: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
      prisma.user.count({ where: { isGuest: false } }),
      prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.xp.aggregate({ _sum: { total: true } }),
      prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
    ]);
  return {
    products,
    listedProducts,
    orders,
    pendingOrders,
    customers,
    revenueCents: revenue._sum.totalCents ?? 0,
    totalXp: xp._sum.total ?? 0,
    lowStock,
  };
}

export interface AdminOrderListRow {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  customer: string;
  itemCount: number;
}

export async function listOrders(status?: string, limit = 100): Promise<AdminOrderListRow[]> {
  const rows = await prisma.order.findMany({
    ...(status ? { where: { status: status as never } } : {}),
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { email: true, phone: true } }, _count: { select: { items: true } } },
  });
  return rows.map((o) => ({
    id: o.id,
    status: o.status,
    totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(),
    customer: o.user.email ?? o.user.phone ?? 'Guest',
    itemCount: o._count.items,
  }));
}

export interface AdminOrderDetail {
  id: string;
  status: string;
  createdAt: string;
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  walletCents: number;
  totalCents: number;
  customer: { id: string; email: string | null; phone: string | null };
  address: { label: string; line1: string; line2: string | null; city: string; pincode: string } | null;
  payment: { status: string; amountCents: number } | null;
  items: { name: string; brand: string; label: string; qty: number; priceCents: number }[];
  history: { status: string; at: string }[];
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, phone: true } },
      payment: true,
      history: { orderBy: { at: 'asc' } },
      items: {
        include: {
          variant: { include: { product: { include: { brand: true } } } },
        },
      },
    },
  });
  if (!o) return null;

  const address = o.addressId
    ? await prisma.address.findUnique({ where: { id: o.addressId } })
    : null;

  return {
    id: o.id,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    deliveryCents: o.deliveryCents,
    walletCents: o.walletCents,
    totalCents: o.totalCents,
    customer: { id: o.user.id, email: o.user.email, phone: o.user.phone },
    address: address
      ? {
          label: address.label,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          pincode: address.pincode,
        }
      : null,
    payment: o.payment ? { status: o.payment.status, amountCents: o.payment.amountCents } : null,
    items: o.items.map((i) => ({
      name: i.variant.product.name,
      brand: i.variant.product.brand.name,
      label: i.variant.label,
      qty: i.qty,
      priceCents: i.priceCents,
    })),
    history: o.history.map((h) => ({ status: h.status, at: h.at.toISOString() })),
  };
}

export interface AdminProductListRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  grade: string | null;
  isListed: boolean;
  priceCents: number;
  stock: number;
}

export async function listProducts(search?: string, limit = 200): Promise<AdminProductListRow[]> {
  const rows = await prisma.product.findMany({
    ...(search ? { where: { name: { contains: search, mode: 'insensitive' as const } } } : {}),
    orderBy: { name: 'asc' },
    take: limit,
    include: {
      brand: true,
      category: true,
      grade: true,
      variants: { orderBy: { priceCents: 'asc' } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    category: p.category.name,
    grade: p.grade?.grade ?? null,
    isListed: p.isListed,
    priceCents: p.variants[0]?.priceCents ?? 0,
    stock: p.variants.reduce((s, v) => s + v.stock, 0),
  }));
}

export interface ProductEditData {
  id: string;
  name: string;
  barcode: string | null;
  brandName: string;
  categoryId: string;
  isListed: boolean;
  priceCents: number;
  discountCents: number;
  stock: number;
  variantLabel: string;
  grade: string | null;
  nutrition: {
    energyKcal: number;
    sugarG: number;
    sodiumMg: number;
    proteinG: number;
    fatG: number;
    satFatG: number;
    fibreG: number;
  };
  ingredientsText: string;
}

export async function getProductForEdit(id: string): Promise<ProductEditData | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      grade: true,
      nutrition: true,
      ingredients: true,
      variants: { orderBy: { priceCents: 'asc' } },
    },
  });
  if (!p) return null;
  const v = p.variants[0];
  const n = p.nutrition;
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    brandName: p.brand.name,
    categoryId: p.categoryId,
    isListed: p.isListed,
    priceCents: v?.priceCents ?? 0,
    discountCents: v?.discountCents ?? 0,
    stock: v?.stock ?? 0,
    variantLabel: v?.label ?? 'Standard',
    grade: p.grade?.grade ?? null,
    nutrition: {
      energyKcal: n?.energyKcal ?? 0,
      sugarG: n?.sugarG ?? 0,
      sodiumMg: n?.sodiumMg ?? 0,
      proteinG: n?.proteinG ?? 0,
      fatG: n?.fatG ?? 0,
      satFatG: n?.satFatG ?? 0,
      fibreG: n?.fibreG ?? 0,
    },
    ingredientsText: p.ingredients.map((i) => i.name).join(', '),
  };
}

export async function listBrands(): Promise<{ id: string; name: string }[]> {
  return prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
}

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  return prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
}

export interface ProductInput {
  name: string;
  barcode?: string | null;
  brandName: string;
  categoryId: string;
  isListed: boolean;
  priceCents: number;
  discountCents: number;
  stock: number;
  variantLabel: string;
  nutrition: ProductEditData['nutrition'];
  ingredientsText: string;
}

async function upsertBrand(name: string): Promise<string> {
  const brand = await prisma.brand.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return brand.id;
}

/** Create a product with nutrition, ingredients and one variant. Returns id. */
export async function createProduct(input: ProductInput): Promise<string> {
  const brandId = await upsertBrand(input.brandName);
  const ingredients = parseIngredients(input.ingredientsText);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      barcode: input.barcode || null,
      categoryId: input.categoryId,
      brandId,
      isListed: input.isListed,
      nutrition: { create: input.nutrition },
      ingredients: {
        create: ingredients.map((i) => ({
          name: i.name,
          isAdditive: i.isAdditive,
          isAllergen: i.isAllergen,
        })),
      },
      variants: {
        create: {
          label: input.variantLabel || 'Standard',
          priceCents: input.priceCents,
          discountCents: input.discountCents,
          stock: input.stock,
        },
      },
    },
  });
  return product.id;
}

/** Update product core fields, nutrition, ingredients and primary variant. */
export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const brandId = await upsertBrand(input.brandName);
  const ingredients = parseIngredients(input.ingredientsText);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        barcode: input.barcode || null,
        categoryId: input.categoryId,
        brandId,
        isListed: input.isListed,
      },
    });

    await tx.nutrition.upsert({
      where: { productId: id },
      update: input.nutrition,
      create: { productId: id, ...input.nutrition },
    });

    await tx.ingredient.deleteMany({ where: { productId: id } });
    if (ingredients.length > 0) {
      await tx.ingredient.createMany({
        data: ingredients.map((i) => ({
          productId: id,
          name: i.name,
          isAdditive: i.isAdditive,
          isAllergen: i.isAllergen,
        })),
      });
    }

    const variant = await tx.productVariant.findFirst({
      where: { productId: id },
      orderBy: { priceCents: 'asc' },
    });
    if (variant) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          label: input.variantLabel || 'Standard',
          priceCents: input.priceCents,
          discountCents: input.discountCents,
          stock: input.stock,
        },
      });
    } else {
      await tx.productVariant.create({
        data: {
          productId: id,
          label: input.variantLabel || 'Standard',
          priceCents: input.priceCents,
          discountCents: input.discountCents,
          stock: input.stock,
        },
      });
    }
  });
}

/** Delete a product. Fails safely if it is referenced by existing orders. */
export async function deleteProduct(id: string): Promise<{ ok: boolean; reason?: string }> {
  const orderItem = await prisma.orderItem.findFirst({
    where: { variant: { productId: id } },
    select: { id: true },
  });
  if (orderItem) {
    return { ok: false, reason: 'Product appears in existing orders. Unlist it instead of deleting.' };
  }
  await prisma.product.delete({ where: { id } });
  return { ok: true };
}

export interface AdminCustomerRow {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
  xp: number;
}

export async function listCustomers(limit = 200): Promise<AdminCustomerRow[]> {
  const users = await prisma.user.findMany({
    where: { isGuest: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { orders: true } },
      orders: { where: { status: { not: 'CANCELLED' } }, select: { totalCents: true } },
      xp: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
    orderCount: u._count.orders,
    totalSpentCents: u.orders.reduce((s, o) => s + o.totalCents, 0),
    xp: u.xp?.total ?? 0,
  }));
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  role: string;
  orders: { id: string; status: string; totalCents: number; createdAt: string }[];
}

export async function getCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      xp: true,
      orders: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!u) return null;
  const nonCancelled = u.orders.filter((o) => o.status !== 'CANCELLED');
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    orderCount: u.orders.length,
    totalSpentCents: nonCancelled.reduce((s, o) => s + o.totalCents, 0),
    xp: u.xp?.total ?? 0,
    orders: u.orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export interface AdminCouponRow {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderCents: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export async function listCoupons(): Promise<AdminCouponRow[]> {
  const rows = await prisma.coupon.findMany({ orderBy: { expiresAt: 'desc' } });
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderCents: c.minOrderCents,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt.toISOString(),
    isActive: c.isActive,
  }));
}

export interface CouponInput {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrderCents: number;
  usageLimit: number;
  expiresAt: Date;
}

export async function createCoupon(input: CouponInput): Promise<void> {
  await prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      minOrderCents: input.minOrderCents,
      usageLimit: input.usageLimit,
      expiresAt: input.expiresAt,
    },
  });
}

export async function setCouponActive(id: string, isActive: boolean): Promise<void> {
  await prisma.coupon.update({ where: { id }, data: { isActive } });
}
