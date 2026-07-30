import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/presentation/trpc/appRouter';
import type { Context } from '@/presentation/trpc/trpc';
import { SupabaseJwtVerifier } from '@/infrastructure/auth/SupabaseJwtVerifier';
import { RedisCache } from '@/infrastructure/cache/RedisCache';

/**
 * tRPC HTTP endpoint (Next.js App Router route handler).
 *
 * Auth: the client sends its Supabase access token as a Bearer token, verified
 * here to populate the request context. CORS is restricted via the
 * CORS_ALLOWED_ORIGINS env (comma-separated; '*' or unset allows all — fine for
 * dev/native). A best-effort, fail-open per-IP rate limit protects the API when
 * Redis is configured.
 */
const verifier = new SupabaseJwtVerifier(process.env.SUPABASE_JWT_SECRET);
const rateCache = new RedisCache(process.env.REDIS_URL);

const RATE_LIMIT_PER_MIN = 240;

const BASE_CORS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!allow || allow === '*') {
    return { ...BASE_CORS, 'Access-Control-Allow-Origin': '*' };
  }
  const list = allow.split(',').map((s) => s.trim()).filter(Boolean);
  const chosen = origin && list.includes(origin) ? origin : (list[0] ?? '*');
  return { ...BASE_CORS, 'Access-Control-Allow-Origin': chosen, Vary: 'Origin' };
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function createContext(req: Request): Promise<Context> {
  return (async () => {
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const user = await verifier.verify(auth.slice(7));
      if (user) return { userId: user.userId, role: user.role };
    }
    return { userId: null, role: null };
  })();
}

async function handler(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));

  // Fail-open per-IP rate limit (only enforced when Redis is reachable).
  const minute = Math.floor(Date.now() / 60000);
  const count = await rateCache.incr(`rl:${clientIp(req)}:${minute}`, 65);
  if (count !== null && count > RATE_LIMIT_PER_MIN) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const res = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export { handler as GET, handler as POST };
