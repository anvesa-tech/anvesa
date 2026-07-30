import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { NotificationService, type NotificationRepository } from './NotificationService';
import type { NotificationGateway } from '../../domain/ports/gateways';
import { NOTIF_CATEGORIES, type NotifCategory } from '../../domain/notifications/rules';

const RUNS = { numRuns: 100 };

function build(opts: { tokens: string[]; enabled: Set<NotifCategory>; failSends?: boolean }) {
  const tokenSet = new Set(opts.tokens);
  let sends = 0;
  const failures: string[] = [];
  const repo: NotificationRepository = {
    async registerToken(_u, token) {
      tokenSet.add(token); // Set → idempotent
    },
    async getTokens() {
      return [...tokenSet];
    },
    async removeToken(token) {
      tokenSet.delete(token);
    },
    async isCategoryEnabled(_u, category) {
      return opts.enabled.has(category);
    },
    async recordFailure(_u, category) {
      failures.push(category);
    },
  };
  const gateway: NotificationGateway = {
    async send() {
      sends += 1;
      if (opts.failSends) throw new Error('send failed');
    },
  };
  return { svc: new NotificationService(repo, gateway), tokenSet, getSends: () => sends, failures };
}

describe('NotificationService', () => {
  // Feature: anvesa-marketplace, Property 60: Disabled notification categories are suppressed
  it('Property 60: dispatch iff a token exists and the category is enabled', () => {
    fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.constantFrom<NotifCategory>(...NOTIF_CATEGORIES),
        fc.boolean(),
        async (hasToken, category, enabled) => {
          const f = build({
            tokens: hasToken ? ['t1'] : [],
            enabled: enabled ? new Set([category]) : new Set(),
          });
          const res = await f.svc.dispatch('u1', category, { title: 'x', body: 'y' });
          expect(res.dispatched).toBe(hasToken && enabled);
        },
      ),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 58: Save operations are idempotent
  it('Property 58: registering the same token repeatedly yields one token', () => {
    fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (times) => {
        const f = build({ tokens: [], enabled: new Set() });
        for (let i = 0; i < times; i += 1) await f.svc.registerToken('u1', 'dev-token');
        expect(f.tokenSet.size).toBe(1);
      }),
      RUNS,
    );
  });

  it('retries up to 3 times then records a failure', async () => {
    const f = build({ tokens: ['t1'], enabled: new Set(['rewards']), failSends: true });
    const res = await f.svc.dispatch('u1', 'rewards', { title: 'x', body: 'y' });
    expect(res.dispatched).toBe(false);
    expect(f.getSends()).toBe(3);
    expect(f.failures).toEqual(['rewards']);
  });
});
