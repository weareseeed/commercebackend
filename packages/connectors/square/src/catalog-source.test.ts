import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { loadSquareCatalog } from './catalog-source.js';
import { loadSquareCatalogFixture } from './fixture-catalog.js';

describe('loadSquareCatalog', () => {
  const originalToken = process.env.SQUARE_ACCESS_TOKEN;
  const originalEnvironment = process.env.SQUARE_ENVIRONMENT;

  beforeEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_ENVIRONMENT;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalToken === undefined) delete process.env.SQUARE_ACCESS_TOKEN;
    else process.env.SQUARE_ACCESS_TOKEN = originalToken;
    if (originalEnvironment === undefined) delete process.env.SQUARE_ENVIRONMENT;
    else process.env.SQUARE_ENVIRONMENT = originalEnvironment;
  });

  it('falls back to the static fixture when SQUARE_ACCESS_TOKEN is unset', async () => {
    const objects = await loadSquareCatalog();
    expect(objects).toEqual(loadSquareCatalogFixture());
  });

  it('falls back to the static fixture when SQUARE_ACCESS_TOKEN is an obvious placeholder', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'your_square_sandbox_access_token';
    const objects = await loadSquareCatalog();
    expect(objects).toEqual(loadSquareCatalogFixture());
  });

  it('fetches from the live Square sandbox API when a real access token is configured', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'real_looking_token_abc123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [{ type: 'ITEM', id: 'SQ_LIVE_ITEM' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const objects = await loadSquareCatalog();

    expect(objects).toEqual([{ type: 'ITEM', id: 'SQ_LIVE_ITEM' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('connect.squareupsandbox.com');
  });

  it('fetches from the live Square production API when SQUARE_ENVIRONMENT=production', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'real_looking_token_abc123';
    process.env.SQUARE_ENVIRONMENT = 'production';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await loadSquareCatalog();

    expect(String(fetchMock.mock.calls[0][0])).toContain('connect.squareup.com');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('squareupsandbox.com');
  });
});
