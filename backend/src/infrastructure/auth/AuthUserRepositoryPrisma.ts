import type { PrismaClient } from '@prisma/client';
import type { AuthUserRepository } from '../../domain/auth/ports';

/** Prisma-backed auth user lookup/creation (Requirement 1, 2). */
export class AuthUserRepositoryPrisma implements AuthUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findOrCreateByPhone(phone: string): Promise<{ id: string; role: string }> {
    const user = await this.db.user.upsert({
      where: { phone },
      update: { lastActiveAt: new Date() },
      create: { phone },
    });
    return { id: user.id, role: user.role };
  }

  async findOrCreateBySocial(
    provider: 'apple' | 'google',
    subject: string,
  ): Promise<{ id: string; role: string }> {
    const field = provider === 'apple' ? 'appleSub' : 'googleSub';
    const existing = await this.db.user.findFirst({ where: { [field]: subject } });
    if (existing) return { id: existing.id, role: existing.role };
    const user = await this.db.user.create({ data: { [field]: subject } });
    return { id: user.id, role: user.role };
  }

  async createGuest(): Promise<{ id: string; role: string }> {
    const user = await this.db.user.create({ data: { isGuest: true } });
    return { id: user.id, role: user.role };
  }

  async ensure(userId: string, email: string | null, phone: string | null): Promise<void> {
    // Mirror the Supabase auth user into our local User table (id === auth.uid()).
    await this.db.user.upsert({
      where: { id: userId },
      update: { lastActiveAt: new Date() },
      create: {
        id: userId,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
    });
  }
}
