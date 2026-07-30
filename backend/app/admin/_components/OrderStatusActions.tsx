'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUSES, isValidTransition, type OrderStatus } from '@/domain/orders/statusMachine';

/** Advance an order through the state machine (only valid transitions shown). */
export function OrderStatusActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nexts = ORDER_STATUSES.filter((s) => isValidTransition(status as OrderStatus, s));

  const update = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? 'Update failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (nexts.length === 0) {
    return <span className="nb-muted">No further transitions (order is {status.toLowerCase()}).</span>;
  }

  return (
    <div>
      <div className="nb-row">
        {nexts.map((s) => (
          <button
            key={s}
            disabled={busy}
            onClick={() => update(s)}
            className={`nb-btn ${s === 'CANCELLED' ? 'nb-btn-danger' : 'nb-btn-green'}`}
          >
            {s === 'CANCELLED' ? 'Cancel order' : `→ ${s}`}
          </button>
        ))}
      </div>
      {error && (
        <p className="nb-note nb-note-err" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
