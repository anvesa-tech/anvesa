import type { PrismaClient } from '@prisma/client';
import type { AuditRepository } from '../../domain/ports/repositories';

/** Prisma-backed audit log (Requirement 30.8). */
export class AuditRepositoryPrisma implements AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(entry: {
    actorId: string | null;
    action: string;
    attempted?: unknown;
  }): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        attempted:
          entry.attempted === undefined ? undefined : JSON.parse(JSON.stringify(entry.attempted)),
      },
    });
  }
}
