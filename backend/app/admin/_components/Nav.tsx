'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/coupons', label: 'Coupons' },
];

/** Neo-Brutalist sidebar navigation with active-route highlighting. */
export function Nav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const logout = async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside className="nb-sidebar">
      <h1 className="nb-brand">ANVESA</h1>
      <p className="nb-brand-tag">Admin Console</p>
      <nav className="nb-nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`nb-nav-link${isActive(l.href) ? ' active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div style={{ marginTop: 28 }}>
        <p style={{ color: '#EADDFF', fontSize: 12, fontWeight: 700, marginBottom: 8, wordBreak: 'break-all' }}>
          {email ?? 'Administrator'}
        </p>
        <button className="nb-btn nb-btn-yellow" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
