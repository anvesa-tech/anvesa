import type { PrismaClient } from '@prisma/client';
import type { AddressRepository } from '../../domain/ports/repositories';

/** Prisma-backed address ownership lookup (Requirement 16, 30). */
export class AddressRepositoryPrisma implements AddressRepository {
  constructor(private readonly db: PrismaClient) {}

  async ownerOf(addressId: string): Promise<string | null> {
    const a = await this.db.address.findUnique({
      where: { id: addressId },
      select: { userId: true },
    });
    return a?.userId ?? null;
  }
}
