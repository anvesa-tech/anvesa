/**
 * Label OCR — native fallback (Requirement 10).
 *
 * On-device OCR requires a native ML module (a custom dev build). In this
 * managed build OCR runs on web only, so the native path reports unsupported
 * and the UI falls back to manual entry. See labelOcr.web.ts for the browser
 * implementation (Tesseract.js).
 */
export const ocrSupported = false;

export interface OcrProgress {
  (fraction: number): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function captureAndReadLabel(_onProgress?: OcrProgress): Promise<string | null> {
  throw new Error('Label scanning runs on the web build. On device, enter the label details manually.');
}
