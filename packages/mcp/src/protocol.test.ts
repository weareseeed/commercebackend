import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from './index.js';

/**
 * Full MCP protocol round-trip: a real Client talking to our server over an
 * in-memory transport, covering the spec's DoD ("an MCP client can list tools
 * and run a search against the sandbox") without a live HTTP server.
 */
describe('MCP protocol round-trip', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function connectedClient(dryRun = false) {
    const { server } = buildServer({
      apiUrl: 'https://api.example.test',
      apiKey: 'sk_test_secret',
      defaultCurrency: 'usd',
      dryRun,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    return client;
  }

  it('lists all documented tools', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toContain('commercebackend_search_listings');
    expect(tools.length).toBe(9);
  });

  it('runs commercebackend_search_listings against a mocked API', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ results: [{ listing: { id: 'lst_1' }, matchReason: 'title', score: 1 }] }),
        { status: 200 }
      )
    );

    const client = await connectedClient();
    const result = await client.callTool({
      name: 'commercebackend_search_listings',
      arguments: { query: 'widget' },
    });

    expect(result.isError).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/search',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rejects an unknown tool argument shape without touching the network', async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'commercebackend_search_listings',
      arguments: {},
    });

    expect(result.isError).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes the agent-skill-kit resource list', async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();
    expect(resources.some((r) => r.uri === 'commercebackend://agent-skill-kit/coding')).toBe(true);
  });
});
