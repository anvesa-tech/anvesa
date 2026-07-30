'use client';

import { useEffect, useState } from 'react';

interface ModeInfo {
  mode: 'test' | 'live';
  testConfigured: boolean;
  liveConfigured: boolean;
  activeKeyId: string | null;
}

/** Razorpay test/live switch + status (Requirement 17). */
export function PaymentMode() {
  const [info, setInfo] = useState<ModeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/admin/api/payment-mode');
    if (res.ok) setInfo((await res.json()) as ModeInfo);
  };
  useEffect(() => {
    void load();
  }, []);

  const switchTo = async (mode: 'test' | 'live') => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/admin/api/payment-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; mode?: string };
      if (!res.ok) {
        setNote(d.error ?? 'Switch failed');
      } else {
        setNote(`Switched to ${d.mode?.toUpperCase()} mode.`);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="nb-card"><span className="nb-muted">Loading payment settings…</span></div>;

  const badge = (ok: boolean) => (
    <span className="nb-badge" style={{ background: ok ? 'var(--nb-green)' : '#DDD' }}>
      {ok ? 'Configured' : 'Missing keys'}
    </span>
  );

  return (
    <div className="nb-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="nb-stat-label">Razorpay mode</div>
          <div style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', color: info.mode === 'live' ? 'var(--nb-red)' : 'var(--nb-purple)' }}>
            {info.mode}
          </div>
          {info.activeKeyId && <div className="nb-muted" style={{ fontSize: 12 }}>Key: {info.activeKeyId}</div>}
        </div>
        <div className="nb-row">
          <button
            className={`nb-btn ${info.mode === 'test' ? 'nb-btn-accent' : ''}`}
            disabled={busy || info.mode === 'test'}
            onClick={() => switchTo('test')}
          >
            Use Test
          </button>
          <button
            className={`nb-btn ${info.mode === 'live' ? 'nb-btn-danger' : ''}`}
            disabled={busy || info.mode === 'live'}
            onClick={() => switchTo('live')}
          >
            Go Live
          </button>
        </div>
      </div>

      <div className="nb-row" style={{ marginTop: 14 }}>
        <span>Test keys: {badge(info.testConfigured)}</span>
        <span>Live keys: {badge(info.liveConfigured)}</span>
      </div>

      {note && <p className="nb-note nb-note-ok" style={{ marginTop: 12 }}>{note}</p>}

      <p className="nb-muted" style={{ marginTop: 12, fontSize: 13 }}>
        Keys are set via environment variables (RAZORPAY_TEST_* / RAZORPAY_LIVE_*). This switch changes
        which set is active — no redeploy needed. Rotate keys by updating the env vars.
      </p>
    </div>
  );
}
