import Redis from 'ioredis';
import type { CachePort } from '../../domain/ports/gateways';

/**
 * Redis-backed CachePort (Requirement 29.6). Cache-aside with TTL plus
 * ephemeral holds (used for delivery-slot reservations). Falls back to a safe
 * no-op if Redis is unreachable so reads still succeed from the database.
 */
export class RedisCache implements CachePort {
  private client: Redis | null;

  constructor(url: string | undefined) {
    try {
      this.client = url ? new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 }) : null;
      this.client?.on('error', () => {
        /* swallow — cache is best-effort */
      });
    } catch {
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch {
      /* best-effort */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* best-effort */
    }
  }

  async hold(key: string, ttlSec: number): Promise<boolean> {
    if (!this.client) return true;
    try {
      const res = await this.client.set(key, '1', 'EX', ttlSec, 'NX');
      return res === 'OK';
    } catch {
      return true;
    }
  }

  async release(key: string): Promise<void> {
    await this.del(key);
  }

  /**
   * Atomically increment a counter with a TTL on first write. Returns the new
   * count, or null if Redis is unavailable (callers should fail open).
   */
  async incr(key: string, ttlSec: number): Promise<number | null> {
    if (!this.client) return null;
    try {
      const n = await this.client.incr(key);
      if (n === 1) await this.client.expire(key, ttlSec);
      return n;
    } catch {
      return null;
    }
  }
}
