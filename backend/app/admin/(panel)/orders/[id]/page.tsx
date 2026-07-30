import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderDetail } from '@/infrastructure/prisma/adminQueries';
import { OrderStatusActions } from '../../../_components/OrderStatusActions';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/** Order detail (Requirement 27.4-27.5): items, customer, address, timeline, actions. */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id).catch(() => null);
  if (!order) notFound();

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Order #{order.id.slice(0, 8)}</h1>
          <p className="nb-sub">
            Placed {new Date(order.createdAt).toLocaleString('en-IN')} ·{' '}
            <span className="nb-badge">{order.status}</span>
          </p>
        </div>
        <Link href="/admin/orders" className="nb-btn">
          ← All orders
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="nb-table-wrap">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{it.name}</strong>
                      <div className="nb-muted" style={{ fontSize: 12 }}>{it.brand}</div>
                    </td>
                    <td>{it.label}</td>
                    <td>{it.qty}</td>
                    <td>{inr(it.priceCents)}</td>
                    <td>{inr(it.priceCents * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="nb-h2">Update status</h2>
          <div className="nb-card">
            <OrderStatusActions orderId={order.id} status={order.status} />
          </div>

          <h2 className="nb-h2">Timeline</h2>
          <div className="nb-card">
            {order.history.length === 0 ? (
              <span className="nb-muted">No status events.</span>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 18, fontWeight: 700 }}>
                {order.history.map((h, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {h.status}{' '}
                    <span className="nb-muted" style={{ fontWeight: 600 }}>
                      — {new Date(h.at).toLocaleString('en-IN')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="nb-card">
            <div className="nb-stat-label" style={{ marginBottom: 10 }}>Summary</div>
            <Row k="Subtotal" v={inr(order.subtotalCents)} />
            <Row k="Discount" v={`− ${inr(order.discountCents)}`} />
            <Row k="Wallet" v={`− ${inr(order.walletCents)}`} />
            <Row k="Delivery" v={inr(order.deliveryCents)} />
            <div style={{ borderTop: '3px solid #111', margin: '10px 0' }} />
            <Row k="Total" v={inr(order.totalCents)} bold />
            <div style={{ marginTop: 10 }}>
              <span className="nb-badge">{order.payment ? `PAYMENT ${order.payment.status}` : 'NO PAYMENT'}</span>
            </div>
          </div>

          <div className="nb-card">
            <div className="nb-stat-label" style={{ marginBottom: 10 }}>Customer</div>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{order.customer.email ?? order.customer.phone ?? 'Guest'}</p>
            <Link href={`/admin/customers/${order.customer.id}`} className="nb-link">
              View customer →
            </Link>
          </div>

          <div className="nb-card">
            <div className="nb-stat-label" style={{ marginBottom: 10 }}>Delivery address</div>
            {order.address ? (
              <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                <strong>{order.address.label}</strong>
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ''}
                <br />
                {order.address.city} — {order.address.pincode}
              </p>
            ) : (
              <span className="nb-muted">No address on file.</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: bold ? 900 : 600, fontSize: bold ? 18 : 14 }}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
