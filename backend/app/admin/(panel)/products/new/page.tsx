import Link from 'next/link';
import { listCategories } from '@/infrastructure/prisma/adminQueries';
import { ProductForm, type ProductFormValues } from '../../../_components/ProductForm';

export const dynamic = 'force-dynamic';

const EMPTY: ProductFormValues = {
  name: '',
  barcode: '',
  brandName: '',
  categoryId: '',
  isListed: true,
  priceRupees: '',
  discountRupees: '0',
  stock: '0',
  variantLabel: 'Standard',
  ingredientsText: '',
  nutrition: { energyKcal: '', sugarG: '', sodiumMg: '', proteinG: '', fatG: '', satFatG: '', fibreG: '' },
};

/** Create a new product (Requirement 27). */
export default async function NewProductPage() {
  const categories = await listCategories().catch(() => []);
  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">New product</h1>
          <p className="nb-sub">Grade is computed from composition on save.</p>
        </div>
        <Link href="/admin/products" className="nb-btn">
          ← Products
        </Link>
      </div>
      <ProductForm initial={EMPTY} categories={categories} mode="create" />
    </>
  );
}
