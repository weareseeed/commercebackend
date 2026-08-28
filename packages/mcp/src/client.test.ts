import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommerceBackendClient, CommerceBackendApiError } from './client.js';
import type { RuntimeConfig } from './config.js';

const config: RuntimeConfig = {
  apiUrl: 'https://api.example.test',
  apiKey: 'sk_test_secret',
  defaultCurrency: 'usd',
  dryRun: false,
};

describe('CommerceBackendClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a bearer-authenticated GET request', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ listing: { id: 'lst_1' } }), { status: 200 })
    );

    const client = new CommerceBackendClient(config);
    const result = await client.get('/v1/listings/lst_1');

    expect(result).toEqual({ listing: { id: 'lst_1' } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/listings/lst_1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer sk_test_secret' }),
      })
    );
  });

  it('sends a JSON body on POST', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = new CommerceBackendClient(config);
    await client.post('/v1/listings', { title: 'Widget' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ title: 'Widget' });
  });

  it('throws CommerceBackendApiError with the API error message on failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Listing not found' } }), {
        status: 404,
      })
    );

    const client = new CommerceBackendClient(config);
    await expect(client.get('/v1/listings/missing')).rejects.toMatchObject({
      status: 404,
      message: 'Listing not found',
    });
  });

  it('never includes the API key in a thrown error', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'nope' } }), { status: 403 })
    );

    const client = new CommerceBackendClient(config);
    try {
      await client.get('/v1/listings/x');
      expect.fail('expected request to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CommerceBackendApiError);
      expect(JSON.stringify(error)).not.toContain(config.apiKey);
      expect((error as Error).message).not.toContain(config.apiKey);
    }
  });

  it('refuses to send a request whose path would resolve to a different host', async () => {
    const client = new CommerceBackendClient(config);

    await expect(client.get('//evil.test/steal')).rejects.toThrow(/unexpected host/);
    await expect(client.get('https://evil.test/steal')).rejects.toThrow(/unexpected host/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
