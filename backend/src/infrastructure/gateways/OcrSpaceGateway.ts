import type { OcrGateway } from '../../domain/ports/gateways';

/**
 * OCR.space gateway (Requirement 10). Free cloud OCR — reads the text off a
 * photographed food label. Runs server-side so it works on web and native and
 * avoids brittle in-browser WASM. The default 'helloworld' key is the public
 * demo key; set OCRSPACE_API_KEY for higher limits.
 */
interface OcrSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: { ParsedText?: string }[];
}

export class OcrSpaceGateway implements OcrGateway {
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.ocr.space/parse/image';

  constructor(apiKey?: string) {
    this.apiKey = apiKey && apiKey.length > 0 ? apiKey : 'helloworld';
  }

  async readText(imageBase64: string): Promise<string> {
    // OCR.space accepts a data URL. Ensure the prefix is present.
    const base64Image = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const body = new URLSearchParams({
      apikey: this.apiKey,
      base64Image,
      language: 'eng',
      isOverlayRequired: 'false',
      OCREngine: '2',
      scale: 'true',
    });

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`OCR request failed: ${res.status}`);

    const data = (await res.json()) as OcrSpaceResponse;
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage;
      throw new Error(msg || 'OCR could not read the image');
    }
    return (data.ParsedResults ?? [])
      .map((r) => r.ParsedText ?? '')
      .join('\n')
      .trim();
  }
}
