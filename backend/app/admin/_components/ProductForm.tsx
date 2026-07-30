'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ProductFormValues {
  id?: string;
  name: string;
  barcode: string;
  brandName: string;
  categoryId: string;
  isListed: boolean;
  priceRupees: string;
  discountRupees: string;
  stock: string;
  variantLabel: string;
  ingredientsText: string;
  nutrition: Record<NutriKey, string>;
}

type NutriKey = 'energyKcal' | 'sugarG' | 'sodiumMg' | 'proteinG' | 'fatG' | 'satFatG' | 'fibreG';

const NUTRI: { key: NutriKey; label: string }[] = [
  { key: 'energyKcal', label: 'Energy (kcal)' },
  { key: 'sugarG', label: 'Sugar (g)' },
  { key: 'sodiumMg', label: 'Sodium (mg)' },
  { key: 'proteinG', label: 'Protein (g)' },
  { key: 'fatG', label: 'Fat (g)' },
  { key: 'satFatG', label: 'Sat. fat (g)' },
  { key: 'fibreG', label: 'Fibre (g)' },
];

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Create/edit product form. Grade is auto-recomputed server-side on save. */
export function ProductForm({
  initial,
  categories,
  mode,
}: {
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ProductFormValues>) => setV((s) => ({ ...s, ...patch }));
  const setNutri = (k: NutriKey, val: string) => setV((s) => ({ ...s, nutrition: { ...s.nutrition, [k]: val } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim() || !v.brandName.trim() || !v.categoryId) {
      setError('Name, brand and category are required.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      id: v.id,
      name: v.name.trim(),
      barcode: v.barcode.trim() || null,
      brandName: v.brandName.trim(),
      categoryId: v.categoryId,
      isListed: v.isListed,
      priceCents: Math.round(num(v.priceRupees) * 100),
      discountCents: Math.round(num(v.discountRupees) * 100),
      stock: Math.round(num(v.stock)),
      variantLabel: v.variantLabel.trim() || 'Standard',
      ingredientsText: v.ingredientsText,
      nutrition: {
        energyKcal: num(v.nutrition.energyKcal),
        sugarG: num(v.nutrition.sugarG),
        sodiumMg: num(v.nutrition.sodiumMg),
        proteinG: num(v.nutrition.proteinG),
        fatG: num(v.nutrition.fatG),
        satFatG: num(v.nutrition.satFatG),
        fibreG: num(v.nutrition.fibreG),
      },
    };
    try {
      const path = mode === 'create' ? '/admin/api/product-create' : '/admin/api/product-update';
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; grade?: string };
      if (!res.ok) {
        setError(d.error ?? 'Save failed');
        return;
      }
      router.push('/admin/products');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="nb-card">
          <div className="nb-stat-label">Details</div>
          <label className="nb-label">Name</label>
          <input className="nb-input" value={v.name} onChange={(e) => set({ name: e.target.value })} />

          <div className="nb-grid-2">
            <div>
              <label className="nb-label">Brand</label>
              <input className="nb-input" value={v.brandName} onChange={(e) => set({ brandName: e.target.value })} placeholder="Existing or new" />
            </div>
            <div>
              <label className="nb-label">Category</label>
              <select className="nb-select" value={v.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="nb-label">Barcode (optional)</label>
          <input className="nb-input" value={v.barcode} onChange={(e) => set({ barcode: e.target.value })} />

          <label className="nb-label">Ingredients (comma-separated, as printed)</label>
          <textarea
            className="nb-textarea"
            value={v.ingredientsText}
            onChange={(e) => set({ ingredientsText: e.target.value })}
            placeholder="Whole grain oats, sugar, emulsifier (E322)…"
          />

          <div className="nb-stat-label" style={{ marginTop: 20 }}>Nutrition · per 100g</div>
          <div className="nb-grid-3">
            {NUTRI.map((f) => (
              <div key={f.key}>
                <label className="nb-label">{f.label}</label>
                <input
                  className="nb-input"
                  inputMode="decimal"
                  value={v.nutrition[f.key]}
                  onChange={(e) => setNutri(f.key, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="nb-card">
            <div className="nb-stat-label">Pricing & stock</div>
            <label className="nb-label">Variant label</label>
            <input className="nb-input" value={v.variantLabel} onChange={(e) => set({ variantLabel: e.target.value })} placeholder="e.g. 500g" />
            <label className="nb-label">Price (₹)</label>
            <input className="nb-input" inputMode="decimal" value={v.priceRupees} onChange={(e) => set({ priceRupees: e.target.value })} />
            <label className="nb-label">Discount (₹ off MRP)</label>
            <input className="nb-input" inputMode="decimal" value={v.discountRupees} onChange={(e) => set({ discountRupees: e.target.value })} />
            <label className="nb-label">Stock</label>
            <input className="nb-input" inputMode="numeric" value={v.stock} onChange={(e) => set({ stock: e.target.value })} />
            <label className="nb-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={v.isListed} onChange={(e) => set({ isListed: e.target.checked })} />
              Listed on marketplace
            </label>
          </div>

          <div className="nb-card nb-fill-yellow">
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
              The grade is computed from composition automatically on save — it cannot be set by hand.
            </p>
          </div>

          {error && <p className="nb-note nb-note-err">{error}</p>}

          <button type="submit" className="nb-btn nb-btn-accent" disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
