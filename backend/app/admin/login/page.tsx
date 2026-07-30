'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../nb.css';

/** Admin login (Requirement 27.7) — Neo-Brutalist. Posts to /admin/api/login. */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Login failed');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nb-body">
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={submit} className="nb-card" style={{ width: 380, boxShadow: 'var(--nb-shadow-lg)' }}>
          <div
            className="nb-fill-purple"
            style={{ border: '3px solid #111', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}
          >
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: '#fff' }}>
              ANVESA
            </h1>
            <p style={{ margin: '2px 0 0', color: '#EADDFF', fontWeight: 700, fontSize: 13 }}>Admin Console</p>
          </div>

          <label className="nb-label">Email</label>
          <input
            className="nb-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="nb-label">Password</label>
          <input
            className="nb-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="nb-note nb-note-err" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="nb-btn nb-btn-accent"
            style={{ marginTop: 18, width: '100%', justifyContent: 'center', fontSize: 15 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}
