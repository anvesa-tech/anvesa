import Link from 'next/link';
import { listProducts } from '@/infrastructure/prisma/adminQueries';
import { ProductRowActions } from '../../_components/ProductRowActions';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Products list (Requirement 27) with inline management actions. */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listProducts(q, 300).catch(() => []);

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Products</h1>
          <p className="nb-sub">{products.length} product(s)</p>
        </div>
        <Link href="/admin/products/new" className="nb-btn nb-btn-accent">
          + New product
        </Link>
      </div>

      <form className="nb-row" style={{ marginBottom: 18 }} action="/admin/products" method="get">
        <input className="nb-input" name="q" placeholder="Search by name…" defaultValue={q ?? ''} style={{ maxWidth: 320 }} />
        <button className="nb-btn" type="submit">Search</button>
        {q && (
          <Link href="/admin/products" className="nb-btn nb-btn-sm">
            Clear
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="nb-card">
          <span className="nb-muted">No products found.</span>
        </div>
      ) : (
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Listed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={`nb-grade nb-grade-${p.grade ?? 'none'}`}>{p.grade ?? '—'}</span>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="nb-muted" style={{ fontSize: 12 }}>{p.brand}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>{inr(p.priceCents)}</td>
                  <td style={{ color: p.stock <= 5 ? '#D11' : undefined, fontWeight: 800 }}>{p.stock}</td>
                  <td>{p.isListed ? 'Yes' : 'No'}</td>
                  <td>
                    <ProductRowActions id={p.id} isListed={p.isListed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
