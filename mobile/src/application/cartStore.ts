import { create } from 'zustand';
import type { ProductCardModel } from '@/domain/product';

export interface CartLine {
  product: ProductCardModel;
  qty: number;
}

interface CartState {
  lines: Record<string, CartLine>;
  add: (product: ProductCardModel) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
}

/**
 * Client cart state (Zustand). Mirrors Cart_Service semantics locally until
 * the backend is wired; quantities never drop below 1 via setQty.
 */
export const useCartStore = create<CartState>((set, get) => ({
  lines: {},
  add: (product) =>
    set((s) => {
      const existing = s.lines[product.id];
      const qty = (existing?.qty ?? 0) + 1;
      return { lines: { ...s.lines, [product.id]: { product, qty } } };
    }),
  remove: (id) =>
    set((s) => {
      const next = { ...s.lines };
      delete next[id];
      return { lines: next };
    }),
  setQty: (id, qty) =>
    set((s) => {
      const line = s.lines[id];
      if (!line) return s;
      if (qty < 1) {
        const next = { ...s.lines };
        delete next[id];
        return { lines: next };
      }
      return { lines: { ...s.lines, [id]: { ...line, qty } } };
    }),
  clear: () => set({ lines: {} }),
  count: () => Object.values(get().lines).reduce((n, l) => n + l.qty, 0),
  subtotalCents: () =>
    Object.values(get().lines).reduce((sum, l) => sum + l.product.priceCents * l.qty, 0),
}));
