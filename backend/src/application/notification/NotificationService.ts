import {
  MAX_DISPATCH_ATTEMPTS,
  shouldDispatch,
  type NotifCategory,
} from '../../domain/notifications/rules';
import type { NotificationGateway } from '../../domain/ports/gateways';

export interface NotificationRepository {
  /** Register a device token idempotently; returns tokens for the user. */
  registerToken(userId: string, token: string): Promise<void>;
  getTokens(userId: string): Promise<string[]>;
  removeToken(token: string): Promise<void>;
  isCategoryEnabled(userId: string, category: NotifCategory): Promise<boolean>;
  recordFailure(userId: string, category: NotifCategory): Promise<void>;
}

/**
 * Notification_Service (Requirement 26). Idempotent token registration,
 * category suppression, and dispatch with up to 3 retries before recording a
 * failure. Invalid tokens are removed.
 */
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly gateway: NotificationGateway,
  ) {}

  registerToken(userId: string, token: string): Promise<void> {
    return this.repo.registerToken(userId, token);
  }

  removeInvalidToken(token: string): Promise<void> {
    return this.repo.removeToken(token);
  }

  async dispatch(
    userId: string,
    category: NotifCategory,
    payload: { title: string; body: string; data?: unknown },
  ): Promise<{ dispatched: boolean }> {
    const tokens = await this.repo.getTokens(userId);
    const enabled = await this.repo.isCategoryEnabled(userId, category);
    if (!shouldDispatch(tokens.length > 0, enabled)) return { dispatched: false };

    for (let attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt += 1) {
      try {
        await this.gateway.send(tokens, payload);
        return { dispatched: true };
      } catch {
        if (attempt === MAX_DISPATCH_ATTEMPTS) {
          await this.repo.recordFailure(userId, category);
          return { dispatched: false };
        }
      }
    }
    return { dispatched: false };
  }
}
