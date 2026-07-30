/**
 * External gateway ports (Requirement 31.4).
 *
 * Domain-declared interfaces for external systems. Infrastructure provides
 * concrete adapters (Razorpay, OneSignal, Anthropic Claude, Google Maps,
 * Supabase Storage, SMS) injected via the DI composition root.
 */

export interface PaymentGateway {
  createOrder(amountCents: number, orderRef: string): Promise<{ providerOrderId: string }>;
  /** Verify a payment signature. Async because the active key may be resolved at runtime. */
  verifySignature(payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean>;
}

export interface NotificationGateway {
  send(tokens: string[], payload: { title: string; body: string; data?: unknown }): Promise<void>;
}

export interface AiGateway {
  analyze(prompt: string, timeoutMs: number): Promise<string>;
}

export interface SmsGateway {
  sendOtp(phoneE164: string, code: string): Promise<void>;
}

export interface StorageGateway {
  createSignedUploadUrl(path: string, expiresInSec: number): Promise<{ url: string }>;
}

export interface MapsGateway {
  distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number;
}

import type { GradingInput } from '../grading/types';

/** A product resolved from an external database (e.g. Open Food Facts). */
export interface ExternalProductData {
  name: string;
  brand: string;
  imageUrl: string | null;
  input: GradingInput;
}

/** Resolves composition data for barcodes not in the ANVESA catalog. */
export interface ProductDataGateway {
  lookupByBarcode(barcode: string): Promise<ExternalProductData | null>;
}

/** Optical character recognition for scanned food labels (Requirement 10). */
export interface OcrGateway {
  readText(imageBase64: string): Promise<string>;
}

export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Ephemeral lock / hold (e.g. slot reservation). Returns true if acquired. */
  hold(key: string, ttlSec: number): Promise<boolean>;
  release(key: string): Promise<void>;
}
