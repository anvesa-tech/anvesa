/**
 * Grant ANVESA admin access to a user (Requirement 27.7).
 *
 * Usage:
 *   npx tsx prisma/makeAdmin.ts <email> [password]
 *
 * - Looks up the Supabase auth user by email (service-role Admin API).
 * - If not found and a password is given, creates the auth user (email pre-confirmed).
 * - Mirrors the user into our DB with role = ADMIN (id === Supabase auth uid).
 *
 * The admin panel checks this DB role, so this is the single source of truth
 * for who can sign in at /admin.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface SupabaseUser {
  id: string;
  email?: string;
}

async function findByEmail(url: string, key: string, email: string): Promise<SupabaseUser | null> {
  // Paginate the admin users list and match by email (case-insensitive).
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`Supabase admin list failed: ${res.status}`);
    const body = (await res.json()) as { users?: SupabaseUser[] };
    const users = body.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 200) break;
  }
  return null;
}

async function createUser(
  url: string,
  key: string,
  email: string,
  password: string,
): Promise<SupabaseUser> {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`Supabase user create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as SupabaseUser;
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: npx tsx prisma/makeAdmin.ts <email> [password]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
    process.exit(1);
  }

  let user = await findByEmail(url, serviceKey, email);
  if (!user) {
    if (!password) {
      console.error(
        `No Supabase user with email ${email}. Re-run with a password to create one:\n  npx tsx prisma/makeAdmin.ts ${email} <password>`,
      );
      process.exit(1);
    }
    console.log(`Creating Supabase auth user ${email}…`);
    user = await createUser(url, serviceKey, email, password);
  }

  await db.user.upsert({
    where: { id: user.id },
    update: { role: 'ADMIN', email },
    create: { id: user.id, email, role: 'ADMIN' },
  });

  console.log(`✓ ${email} (${user.id}) is now an ADMIN. Sign in at /admin/login.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
