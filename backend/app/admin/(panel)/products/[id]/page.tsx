import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductForEdit, listCategories } from '@/infrastructure/prisma/adminQueries';
import { ProductForm, type ProductFormValues } from '../../../_components/ProductForm';

export const dynamic = 'force-dynamic';

const rupees = (cents: number) => (cents / 100).toString();

/** Edit an existing product (Requirement 27). */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductForEdit(id).catch(() => null),
    listCategories().catch(() => []),
  ]);
  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    barcode: product.barcode ?? '',
    brandName: product.brandName,
    categoryId: product.categoryId,
    isListed: product.isListed,
    priceRupees: rupees(product.priceCents),
    discountRupees: rupees(product.discountCents),
    stock: product.stock.toString(),
    variantLabel: product.variantLabel,
    ingredientsText: product.ingredientsText,
    nutrition: {
      energyKcal: product.nutrition.energyKcal.toString(),
      sugarG: product.nutrition.sugarG.toString(),
      sodiumMg: product.nutrition.sodiumMg.toString(),
      proteinG: product.nutrition.proteinG.toString(),
      fatG: product.nutrition.fatG.toString(),
      satFatG: product.nutrition.satFatG.toString(),
      fibreG: product.nutrition.fibreG.toString(),
    },
  };

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Edit product</h1>
          <p className="nb-sub">
            {product.name} · current grade{' '}
            <span className={`nb-grade nb-grade-${product.grade ?? 'none'}`} style={{ width: 24, height: 24, fontSize: 12, verticalAlign: 'middle' }}>
              {product.grade ?? '—'}
            </span>
          </p>
        </div>
        <Link href="/admin/products" className="nb-btn">
          ← Products
        </Link>
      </div>
      <ProductForm initial={initial} categories={categories} mode="edit" />
    </>
  );
}
