import { describe, it, expect, vi } from 'vitest';
import type { ZodTypeAny } from 'zod';
import { toolDefinitions, invokeTool, type ToolContext, type ToolDefinition } from './tools.js';
import { CommerceBackendApiError, type CommerceBackendClient } from './client.js';
import type { RuntimeConfig } from './config.js';

function getTool(name: string): ToolDefinition<ZodTypeAny> {
  const definition = toolDefinitions.find((tool) => tool.name === name);
  if (!definition) {
    throw new Error(`No tool definition named ${name}`);
  }
  return definition as unknown as ToolDefinition<ZodTypeAny>;
}

function makeClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  } satisfies Partial<CommerceBackendClient> as unknown as CommerceBackendClient;
}

function makeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    apiUrl: 'https://api.example.test',
    apiKey: 'sk_test_secret',
    defaultCurrency: 'usd',
    dryRun: false,
    ...overrides,
  };
}

describe('tool catalog', () => {
  it('matches the tool set documented in docs/api/mcp-tool-spec.md', () => {
    expect(toolDefinitions.map((tool) => tool.name).sort()).toEqual(
      [
        'commercebackend_accept_offer',
        'commercebackend_create_checkout_intent',
        'commercebackend_create_listing',
        'commercebackend_create_offer',
        'commercebackend_get_listing',
        'commercebackend_get_order',
        'commercebackend_search_listings',
        'commercebackend_update_fulfillment_status',
        'commercebackend_update_listing',
      ].sort()
    );
  });
});

describe('commercebackend_search_listings', () => {
  it('maps to POST /v1/search with defaults applied', async () => {
    const client = makeClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [] });
    const ctx: ToolContext = { client, config: makeConfig() };

    const result = await invokeTool(getTool('commercebackend_search_listings'), { query: 'widget' }, ctx);

    expect(client.post).toHaveBeenCalledWith('/v1/search', { query: 'widget', limit: 20, offset: 0 });
    expect(result.isError).toBeUndefined();
  });

  it('rejects missing query without calling the API', async () => {
    const client = makeClient();
    const ctx: ToolContext = { client, config: makeConfig() };

    const result = await invokeTool(getTool('commercebackend_search_listings'), {}, ctx);

    expect(result.isError).toBe(true);
    expect(client.post).not.toHaveBeenCalled();
  });
});

describe('commercebackend_get_listing', () => {
  it('maps to GET /v1/listings/:id', async () => {
    const client = makeClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({ listing: { id: 'lst_1' } });
    const ctx: ToolContext = { client, config: makeConfig() };

    await invokeTool(getTool('commercebackend_get_listing'), { listing_id: 'lst_1' }, ctx);

    expect(client.get).toHaveBeenCalledWith('/v1/listings/lst_1');
  });
});

describe('mutating tools honor COMMERCEBACKEND_DRY_RUN', () => {
  const dryRunConfig = makeConfig({ dryRun: true });

  it('commercebackend_create_listing does not call the API in dry-run mode', async () => {
    const client = makeClient();
    const ctx: ToolContext = { client, config: dryRunConfig };

    const result = await invokeTool(
      getTool('commercebackend_create_listing'),
      { title: 'Widget', type: 'physical_good', priceAmount: 500, quantityAvailable: 1 },
      ctx
    );

    expect(client.post).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"dryRun": true');
  });

  it('commercebackend_accept_offer does not call the API in dry-run mode', async () => {
    const client = makeClient();
    const ctx: ToolContext = { client, config: dryRunConfig };

    await invokeTool(getTool('commercebackend_accept_offer'), { offer_id: 'off_1' }, ctx);

    expect(client.post).not.toHaveBeenCalled();
  });

  it('commercebackend_update_fulfillment_status does not call the API in dry-run mode', async () => {
    const client = makeClient();
    const ctx: ToolContext = { client, config: dryRunConfig };

    await invokeTool(
      getTool('commercebackend_update_fulfillment_status'),
      { order_id: 'ord_1', fulfillmentStatus: 'fulfilled' },
      ctx
    );

    expect(client.post).not.toHaveBeenCalled();
  });
});

describe('commercebackend_create_offer', () => {
  it('maps to POST /v1/listings/:id/offers', async () => {
    const client = makeClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({ offer: { id: 'off_1' } });
    const ctx: ToolContext = { client, config: makeConfig() };

    await invokeTool(
      getTool('commercebackend_create_offer'),
      {
        listing_id: 'lst_1',
        offer: { priceAmount: 500, quantity: 1, expiresAt: '2030-01-01T00:00:00.000Z' },
      },
      ctx
    );

    expect(client.post).toHaveBeenCalledWith('/v1/listings/lst_1/offers', {
      priceAmount: 500,
      quantity: 1,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
  });
});

describe('commercebackend_update_fulfillment_status', () => {
  it('maps to POST (not PATCH) /v1/orders/:id/fulfillment', async () => {
    const client = makeClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      order: { id: 'ord_1', fulfillmentStatus: 'fulfilled', fulfillmentNote: null },
    });
    const ctx: ToolContext = { client, config: makeConfig() };

    await invokeTool(
      getTool('commercebackend_update_fulfillment_status'),
      { order_id: 'ord_1', fulfillmentStatus: 'fulfilled' },
      ctx
    );

    expect(client.post).toHaveBeenCalledWith('/v1/orders/ord_1/fulfillment', {
      fulfillmentStatus: 'fulfilled',
    });
    expect(client.patch).not.toHaveBeenCalled();
  });
});

describe('commercebackend_create_checkout_intent', () => {
  const validArgs = {
    listingId: 'lst_1',
    quantity: 1,
    successUrl: 'https://example.test/success',
    cancelUrl: 'https://example.test/cancel',
  };

  it('states a hosted checkout URL was created', async () => {
    const client = makeClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      checkoutIntent: { status: 'open', checkoutUrl: 'https://checkout.stripe.com/session' },
    });
    const ctx: ToolContext = { client, config: makeConfig() };

    const result = await invokeTool(getTool('commercebackend_create_checkout_intent'), validArgs, ctx);

    expect(result.content[0].text).toContain('hosted Stripe Checkout URL');
    expect(result.content[0].text).not.toContain('payment');
  });

  it('states no hosted URL / no payment confirmation on a safe failure state', async () => {
    const client = makeClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      checkoutIntent: { status: 'human_approval_required', checkoutUrl: null },
    });
    const ctx: ToolContext = { client, config: makeConfig() };

    const result = await invokeTool(getTool('commercebackend_create_checkout_intent'), validArgs, ctx);

    expect(result.content[0].text).toContain('no hosted Checkout URL yet');
    expect(result.content[0].text).toContain('payment not confirmed');
  });

  it('never calls the API in dry-run mode', async () => {
    const client = makeClient();
    const ctx: ToolContext = { client, config: makeConfig({ dryRun: true }) };

    const result = await invokeTool(getTool('commercebackend_create_checkout_intent'), validArgs, ctx);

    expect(client.post).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('"dryRun": true');
  });
});

describe('API error surfacing', () => {
  it('turns a CommerceBackendApiError into an isError tool result without leaking the API key', async () => {
    const client = makeClient();
    (client.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CommerceBackendApiError(404, 'Listing not found', { error: { code: 'NOT_FOUND', message: 'Listing not found' } })
    );
    const config = makeConfig();
    const ctx: ToolContext = { client, config };

    const result = await invokeTool(getTool('commercebackend_get_listing'), { listing_id: 'missing' }, ctx);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Listing not found');
    expect(result.content[0].text).not.toContain(config.apiKey);
  });
});
