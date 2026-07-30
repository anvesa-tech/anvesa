import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton. This module is the only place the rest of the
 * infrastructure layer obtains a database handle. Persistence access is
 * confined to the infrastructure layer (Requirement 31.3).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
