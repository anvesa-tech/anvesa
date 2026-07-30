import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Customer detail with order history (Requirement 27). */
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCustomer(id).catch(() => null);
  if (!c) notFound();

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">{c.email ?? c.phone ?? 'Customer'}</h1>
          <p className="nb-sub">
            {c.role} · joined {new Date(c.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        <Link href="/admin/customers" className="nb-btn">
          ← Customers
        </Link>
      </div>

      <div className="nb-stat-grid" style={{ marginBottom: 8 }}>
        <div className="nb-stat nb-fill-green">
          <div className="nb-stat-value">{inr(c.totalSpentCents)}</div>
          <div className="nb-stat-label">Lifetime spend</div>
        </div>
        <div className="nb-stat nb-fill-yellow">
          <div className="nb-stat-value">{c.orderCount}</div>
          <div className="nb-stat-label">Orders</div>
        </div>
        <div className="nb-stat nb-fill-purple">
          <div className="nb-stat-value">{c.xp}</div>
          <div className="nb-stat-label">Satya XP</div>
        </div>
      </div>

      <h2 className="nb-h2">Order history</h2>
      {c.orders.length === 0 ? (
        <div className="nb-card">
          <span className="nb-muted">No orders.</span>
        </div>
      ) : (
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id.slice(0, 8)}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{inr(o.totalCents)}</td>
                  <td>
                    <span className="nb-badge">{o.status}</span>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="nb-link">
                      View →
                    </Link>
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
