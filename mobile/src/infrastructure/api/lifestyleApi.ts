import { TRPC_URL } from './config';

export interface BundleRow {
  id: string;
  key: string;
  name: string;
  priceCents: number;
  products: { productId: string; name: string; inStock: boolean }[];
  availability: { fullyAvailable: boolean; partiallyAvailable: boolean };
}

export interface ArticleRow {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

async function trpcGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TRPC_URL}/${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  const body = (await res.json()) as { result?: { data?: { json?: T } } };
  return (body.result?.data?.json ?? []) as T;
}

export function fetchBundles(): Promise<BundleRow[]> {
  return trpcGet<BundleRow[]>('bundle.list');
}

export function fetchArticles(): Promise<ArticleRow[]> {
  return trpcGet<ArticleRow[]>('newsletter.articles');
}
