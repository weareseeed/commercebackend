import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchLiveSquareCatalog,
  isPlaceholderSquareToken,
  squareApiBaseUrl,
} from './live-client.js';

describe('isPlaceholderSquareToken', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderSquareToken(undefined)).toBe(true);
    expect(isPlaceholderSquareToken('')).toBe(true);
    expect(isPlaceholderSquareToken('your_square_sandbox_access_token')).toBe(true);
    expect(isPlaceholderSquareToken('mock_token')).toBe(true);
    expect(isPlaceholderSquareToken('PLACEHOLDER')).toBe(true);
  });

  it('treats a real-looking token as not a placeholder', () => {
    expect(isPlaceholderSquareToken('EAAAEOuLnk5c8V9example_real_looking_token')).toBe(false);
  });
});

describe('squareApiBaseUrl', () => {
  it('returns the sandbox host by default and the production host when asked', () => {
    expect(squareApiBaseUrl('sandbox')).toBe('https://connect.squareupsandbox.com');
    expect(squareApiBaseUrl('production')).toBe('https://connect.squareup.com');
  });
});

describe('fetchLiveSquareCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a single page and sends the expected auth headers against the sandbox host', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [{ type: 'ITEM', id: 'SQ_LIVE_1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const objects = await fetchLiveSquareCatalog('real_token_123', 'sandbox');

    expect(objects).toEqual([{ type: 'ITEM', id: 'SQ_LIVE_1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://connect.squareupsandbox.com/v2/catalog/list');
    expect(String(url)).toContain('types=ITEM');
    expect(init.headers.Authorization).toBe('Bearer real_token_123');
    expect(init.headers['Square-Version']).toBeTruthy();
  });

  it('follows pagination cursors until exhausted and aggregates all objects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ objects: [{ type: 'ITEM', id: 'SQ_PAGE_1' }], cursor: 'next-page' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ objects: [{ type: 'ITEM', id: 'SQ_PAGE_2' }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const objects = await fetchLiveSquareCatalog('real_token_123');

    expect(objects.map((o) => o.id)).toEqual(['SQ_PAGE_1', 'SQ_PAGE_2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('cursor=next-page');
  });

  it('throws with the response status when Square returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
    );

    await expect(fetchLiveSquareCatalog('bad_token')).rejects.toThrow(/401/);
  });

  it('throws when the Square response body carries an errors array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ code: 'UNAUTHORIZED', detail: 'This request could not be authorized.' }],
        }),
      })
    );

    await expect(fetchLiveSquareCatalog('bad_token')).rejects.toThrow(
      /UNAUTHORIZED|not be authorized/
    );
  });
});
