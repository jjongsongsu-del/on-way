import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class PublicApiHttpClient {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`Public API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getXml<T = unknown>(url: string): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`Public API request failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseXml<T>(xml);
  }

  async getArrayBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`Public API request failed: ${response.status} ${response.statusText}`);
    }

    return {
      data: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') ?? 'image/png'
    };
  }

  parseXml<T = unknown>(xml: string): T {
    return this.xmlParser.parse(xml) as T;
  }

  createUrl(baseUrl: string, params: Record<string, string | number | undefined>) {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }
}
