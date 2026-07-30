import { readLabelImage } from '@/infrastructure/api/scannerApi';

/**
 * Label OCR — web implementation (Requirement 10).
 *
 * Opens the camera / file picker, downscales the photo (to stay within the OCR
 * service limits and speed things up), then sends it to our backend which runs
 * cloud OCR (OCR.space). Server-side OCR is reliable across browsers and avoids
 * brittle in-browser WASM.
 */
export const ocrSupported = true;

export interface OcrProgress {
  (fraction: number): void;
}

/** Prompt for a photo and return it as a downscaled JPEG data URL, or null. */
function pickAndDownscale(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(typeof reader.result === 'string' ? reader.result : null);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function captureAndReadLabel(onProgress?: OcrProgress): Promise<string | null> {
  const dataUrl = await pickAndDownscale();
  if (!dataUrl) return null;
  onProgress?.(0.4);
  const text = await readLabelImage(dataUrl);
  onProgress?.(1);
  return text;
}
