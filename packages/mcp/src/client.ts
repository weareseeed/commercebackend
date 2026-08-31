import type { RuntimeConfig } from './config.js';

/**
 * Error returned by the CommerceBackend API. The message never includes the
 * Authorization header or raw API key (see docs/api/mcp-tool-spec.md#safety-boundaries).
 */
export class CommerceBackendApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'CommerceBackendApiError';
  }
}

function describeApiError(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return `CommerceBackend API request failed with status ${status}`;
}

/**
 * Thin HTTP adapter over the CommerceBackend native API. Every mutating call
 * goes through this class so dry-run and auth handling stay centralized.
 */
export class CommerceBackendClient {
  constructor(private readonly config: RuntimeConfig) {}

  /**
   * Resolves `path` against the configured API origin and rejects anything
   * that would resolve to a different host — every tool path is built from a
   * fixed template plus encodeURIComponent'd segments, but this closes off
   * `//host/...`-style tool-argument tricks that could otherwise redirect
   * the request to an unintended server (CWE-918).
   */
  private buildUrl(path: string): string {
    const base = new URL(this.config.apiUrl);
    const url = new URL(path, base);
    if (url.origin !== base.origin) {
      throw new Error('Refusing to send a CommerceBackend API request to an unexpected host');
    }
    return url.toString();
  }

  private async request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const data = text.length > 0 ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new CommerceBackendApiError(response.status, describeApiError(response.status, data), data);
    }

    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }
}
