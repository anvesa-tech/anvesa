import Link from 'next/link';
import { getDashboardStats, listOrders } from '@/infrastructure/prisma/adminQueries';
import { PaymentMode } from '../_components/PaymentMode';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Admin dashboard (Requirement 27) — Neo-Brutalist metrics + recent orders. */
export default async function Dashboard() {
  const [stats, recent] = await Promise.all([
    getDashboardStats().catch(() => null),
    listOrders(undefined, 8).catch(() => []),
  ]);

  if (!stats) {
    return (
      <div className="nb-note nb-note-err">Analytics unavailable — database not reachable.</div>
    );
  }

  const cards = [
    { label: 'Revenue', value: inr(stats.revenueCents), fill: 'nb-fill-green' },
    { label: 'Orders', value: stats.orders, fill: 'nb-fill-yellow' },
    { label: 'Pending orders', value: stats.pendingOrders, fill: 'nb-fill-pink' },
    { label: 'Customers', value: stats.customers, fill: 'nb-fill-blue' },
    { label: 'Products listed', value: `${stats.listedProducts}/${stats.products}`, fill: 'nb-fill-white' },
    { label: 'Low stock', value: stats.lowStock, fill: 'nb-fill-white' },
    { label: 'Total Satya XP', value: stats.totalXp, fill: 'nb-fill-purple' },
  ];

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Dashboard</h1>
          <p className="nb-sub">Buy what’s verified, not what’s marketed.</p>
        </div>
        <Link href="/admin/products/new" className="nb-btn nb-btn-accent">
          + New product
        </Link>
      </div>

      <div className="nb-stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`nb-stat ${c.fill}`}>
            <div className="nb-stat-value">{c.value}</div>
            <div className="nb-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <h2 className="nb-h2">Recent orders</h2>
      {recent.length === 0 ? (
        <div className="nb-card">
          <span className="nb-muted">No orders yet.</span>
        </div>
      ) : (
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id.slice(0, 8)}</td>
                  <td>{o.customer}</td>
                  <td>{o.itemCount}</td>
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

      <h2 className="nb-h2">Payments</h2>
      <PaymentMode />

      <h2 className="nb-h2">Grading integrity</h2>
      <div className="nb-card">
        <p style={{ margin: 0, fontWeight: 600, maxWidth: 720 }}>
          Product grades are computed exclusively from composition by the Grading Engine. Advertising,
          sponsorship, payments and brand partnerships are structurally excluded. This console can only
          recompute a grade from composition — grades can never be set or overridden manually, and any
          override attempt is rejected and audited.
        </p>
      </div>
    </>
  );
}
