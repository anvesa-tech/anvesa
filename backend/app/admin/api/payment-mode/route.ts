import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';

export const dynamic = 'force-dynamic';

/** View the current Razorpay mode + which key sets are configured (no secrets). */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const razorpay = getContainer().razorpay;
  const mode = await razorpay.getMode();
  return NextResponse.json({
    mode,
    testConfigured: razorpay.credentialsForMode('test').configured,
    liveConfigured: razorpay.credentialsForMode('live').configured,
    activeKeyId: razorpay.credentialsForMode(mode).keyId ?? null,
  });
}

/** Switch the active Razorpay mode (test/live) at runtime. */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode !== 'test' && body.mode !== 'live') {
    return NextResponse.json({ error: 'mode must be "test" or "live"' }, { status: 400 });
  }
  const razorpay = getContainer().razorpay;
  const creds = razorpay.credentialsForMode(body.mode);
  if (!creds.configured) {
    return NextResponse.json(
      { error: `No ${body.mode} keys configured. Set RAZORPAY_${body.mode.toUpperCase()}_KEY_ID/SECRET first.` },
      { status: 400 },
    );
  }
  await razorpay.setMode(body.mode);
  return NextResponse.json({ ok: true, mode: body.mode });
}
