import Link from 'next/link';
import { listCustomers } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Customers list (Requirement 27). */
export default async function CustomersPage() {
  const customers = await listCustomers(300).catch(() => []);

  return (
    <>
      <div className="nb-topbar">
        <div>
          <h1 className="nb-h1">Customers</h1>
          <p className="nb-sub">{customers.length} registered customer(s)</p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="nb-card">
          <span className="nb-muted">No registered customers yet.</span>
        </div>
      ) : (
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Spent</th>
                <th>XP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.email ?? c.phone ?? c.id.slice(0, 8)}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{c.orderCount}</td>
                  <td>{inr(c.totalSpentCents)}</td>
                  <td>{c.xp}</td>
                  <td>
                    <Link href={`/admin/customers/${c.id}`} className="nb-link">
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
