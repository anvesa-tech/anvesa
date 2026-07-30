import Link from 'next/link';
import { listOrders } from '@/infrastructure/prisma/adminQueries';
import { ORDER_STATUSES } from '@/domain/orders/statusMachine';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Orders list (Requirement 27.4) with status filtering. */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status && ORDER_STATUSES.includes(status as never) ? status : undefined;
  const orders = await listOrders(active, 200).catch(() => []);

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Orders</h1>
          <p className="nb-sub">{orders.length} order(s){active ? ` · ${active}` : ''}</p>
        </div>
      </div>

      <div className="nb-row" style={{ marginBottom: 18 }}>
        <Link href="/admin/orders" className={`nb-btn nb-btn-sm${!active ? ' nb-btn-accent' : ''}`}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`nb-btn nb-btn-sm${active === s ? ' nb-btn-accent' : ''}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="nb-card">
          <span className="nb-muted">No orders match this filter.</span>
        </div>
      ) : (
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id.slice(0, 8)}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{o.customer}</td>
                  <td>{o.itemCount}</td>
                  <td>{inr(o.totalCents)}</td>
                  <td>
                    <span className="nb-badge">{o.status}</span>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="nb-link">
                      Manage →
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
