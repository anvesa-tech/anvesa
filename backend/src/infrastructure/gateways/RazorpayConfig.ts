import { prisma } from '../prisma/client';

export type RazorpayMode = 'test' | 'live';

export interface RazorpayCredentials {
  mode: RazorpayMode;
  keyId: string | undefined;
  keySecret: string | undefined;
  webhookSecret: string | undefined;
  /** True when live credentials are actually present for the active mode. */
  configured: boolean;
}

const MODE_SETTING_KEY = 'razorpay_mode';

/**
 * Resolves the active Razorpay credentials (Requirement 17). Both test and live
 * keys live in the environment; the ACTIVE mode is a runtime-switchable, DB-
 * backed flag (falling back to the RAZORPAY_MODE env default). Switching mode
 * therefore needs no redeploy, and rotating keys is just an env change. Secrets
 * are never stored in the database.
 */
export class RazorpayConfig {
  /** Default mode from env; DB overrides this when set. */
  private envDefaultMode(): RazorpayMode {
    return process.env.RAZORPAY_MODE === 'live' ? 'live' : 'test';
  }

  async getMode(): Promise<RazorpayMode> {
    try {
      const row = await prisma.appSetting.findUnique({ where: { key: MODE_SETTING_KEY } });
      if (row?.value === 'live' || row?.value === 'test') return row.value;
    } catch {
      /* fall back to env default if the settings table is unavailable */
    }
    return this.envDefaultMode();
  }

  async setMode(mode: RazorpayMode): Promise<void> {
    await prisma.appSetting.upsert({
      where: { key: MODE_SETTING_KEY },
      update: { value: mode },
      create: { key: MODE_SETTING_KEY, value: mode },
    });
  }

  /** Resolve credentials for a given mode from the environment. */
  credentialsForMode(mode: RazorpayMode): RazorpayCredentials {
    const keyId =
      mode === 'live'
        ? process.env.RAZORPAY_LIVE_KEY_ID
        : process.env.RAZORPAY_TEST_KEY_ID;
    const keySecret =
      mode === 'live'
        ? process.env.RAZORPAY_LIVE_KEY_SECRET
        : process.env.RAZORPAY_TEST_KEY_SECRET;
    const webhookSecret =
      (mode === 'live'
        ? process.env.RAZORPAY_LIVE_WEBHOOK_SECRET
        : process.env.RAZORPAY_TEST_WEBHOOK_SECRET) ?? process.env.RAZORPAY_WEBHOOK_SECRET;

    // Backward compatibility with the original single-key env vars.
    const finalKeyId = keyId ?? process.env.RAZORPAY_KEY_ID;
    const finalKeySecret = keySecret ?? process.env.RAZORPAY_KEY_SECRET;

    return {
      mode,
      keyId: finalKeyId,
      keySecret: finalKeySecret,
      webhookSecret,
      configured: !!finalKeyId && !!finalKeySecret,
    };
  }

  /** Resolve the credentials for the currently active mode. */
  async active(): Promise<RazorpayCredentials> {
    return this.credentialsForMode(await this.getMode());
  }
}
