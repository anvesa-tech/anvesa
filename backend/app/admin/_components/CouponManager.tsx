'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface CouponRow {
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

const inr = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

/** Coupon list + create + activate/deactivate (Requirement 9, 27). */
export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENT',
    value: '',
    minOrder: '0',
    usageLimit: '100',
    expiresAt: '',
  });

  const set = (patch: Partial<typeof form>) => setForm((s) => ({ ...s, ...patch }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value || !form.expiresAt) {
      setError('Code, value and expiry are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/coupon-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          type: form.type,
          value: Number(form.value),
          minOrderCents: Math.round(Number(form.minOrder) * 100),
          usageLimit: Math.round(Number(form.usageLimit)),
          expiresAt: new Date(form.expiresAt).toISOString(),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? 'Create failed');
        return;
      }
      setForm({ code: '', type: 'PERCENT', value: '', minOrder: '0', usageLimit: '100', expiresAt: '' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setBusy(true);
    try {
      await fetch('/admin/api/coupon-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
      <div>
        {coupons.length === 0 ? (
          <div className="nb-card">
            <span className="nb-muted">No coupons yet.</span>
          </div>
        ) : (
          <div className="nb-table-wrap">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min order</th>
                  <th>Used</th>
                  <th>Expires</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.type === 'PERCENT' ? `${c.value}%` : inr(c.value)}</td>
                    <td>{inr(c.minOrderCents)}</td>
                    <td>{c.usedCount}/{c.usageLimit}</td>
                    <td>{new Date(c.expiresAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className="nb-badge" style={{ background: c.isActive ? 'var(--nb-green)' : '#DDD' }}>
                        {c.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <button
                        disabled={busy}
                        className={`nb-btn nb-btn-sm ${c.isActive ? 'nb-btn-danger' : 'nb-btn-green'}`}
                        onClick={() => toggle(c.id, c.isActive)}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form className="nb-card" onSubmit={create}>
        <div className="nb-stat-label">New coupon</div>
        <label className="nb-label">Code</label>
        <input className="nb-input" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="ANVESA10" />
        <label className="nb-label">Type</label>
        <select className="nb-select" value={form.type} onChange={(e) => set({ type: e.target.value })}>
          <option value="PERCENT">Percent (%)</option>
          <option value="FLAT">Flat (₹ off)</option>
        </select>
        <label className="nb-label">{form.type === 'PERCENT' ? 'Percent off' : 'Rupees off'}</label>
        <input className="nb-input" inputMode="numeric" value={form.value} onChange={(e) => set({ value: e.target.value })} />
        <label className="nb-label">Min order (₹)</label>
        <input className="nb-input" inputMode="numeric" value={form.minOrder} onChange={(e) => set({ minOrder: e.target.value })} />
        <label className="nb-label">Usage limit</label>
        <input className="nb-input" inputMode="numeric" value={form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
        <label className="nb-label">Expires</label>
        <input className="nb-input" type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
        {error && <p className="nb-note nb-note-err" style={{ marginTop: 12 }}>{error}</p>}
        <button type="submit" className="nb-btn nb-btn-accent" disabled={busy} style={{ marginTop: 14, justifyContent: 'center', width: '100%' }}>
          {busy ? 'Saving…' : 'Create coupon'}
        </button>
      </form>
    </div>
  );
}
