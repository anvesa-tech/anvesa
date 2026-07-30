'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Per-row product actions: edit, list/unlist, recompute grade, delete. */
export function ProductRowActions({ id, isListed }: { id: string; isListed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const post = async (path: string, payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; grade?: string };
      if (!res.ok) {
        alert(d.error ?? 'Action failed');
        return;
      }
      if (d.grade) alert(`Recomputed grade: ${d.grade}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await post('/admin/api/product-delete', { productId: id });
  };

  return (
    <div className="nb-row">
      <Link href={`/admin/products/${id}`} className="nb-btn nb-btn-sm">
        Edit
      </Link>
      <button
        disabled={busy}
        className={`nb-btn nb-btn-sm ${isListed ? '' : 'nb-btn-yellow'}`}
        onClick={() => post('/admin/api/product-listing', { productId: id, isListed: !isListed })}
      >
        {isListed ? 'Unlist' : 'List'}
      </button>
      <button
        disabled={busy}
        className="nb-btn nb-btn-sm nb-btn-green"
        onClick={() => post('/admin/api/recompute-grade', { productId: id })}
      >
        Regrade
      </button>
      <button disabled={busy} className="nb-btn nb-btn-sm nb-btn-danger" onClick={remove}>
        Delete
      </button>
    </div>
  );
}
