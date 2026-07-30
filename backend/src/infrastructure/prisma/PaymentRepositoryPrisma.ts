import type { PrismaClient, PaymentStatus } from '@prisma/client';
import type { PaymentRepository } from '../../domain/ports/repositories';

/** Prisma-backed payment records (Requirement 17). */
export class PaymentRepositoryPrisma implements PaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(payment: {
    orderId: string | null;
    amountCents: number;
    status: 'CREATED' | 'SUCCESS' | 'FAILED';
    razorpayRef: string | null;
    signature: string | null;
  }): Promise<void> {
    // Order-less failed attempts (no order created) are recorded as standalone rows.
    if (!payment.orderId) {
      await this.db.payment.create({
        data: {
          amountCents: payment.amountCents,
          status: payment.status as PaymentStatus,
          razorpayRef: payment.razorpayRef,
          signature: payment.signature,
        },
      });
      return;
    }
    await this.db.payment.upsert({
      where: { orderId: payment.orderId },
      update: {
        amountCents: payment.amountCents,
        status: payment.status as PaymentStatus,
        razorpayRef: payment.razorpayRef,
        signature: payment.signature,
      },
      create: {
        orderId: payment.orderId,
        amountCents: payment.amountCents,
        status: payment.status as PaymentStatus,
        razorpayRef: payment.razorpayRef,
        signature: payment.signature,
      },
    });
  }
}
