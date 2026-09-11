import { z, ZodTypeAny } from 'zod';
import {
  CreateListingSchema,
  UpdateListingSchema,
  CreateOfferSchema,
  CreateCheckoutIntentSchema,
  UpdateFulfillmentSchema,
} from '@commercebackend/schemas';
import type { CommerceBackendClient } from './client.js';
import { CommerceBackendApiError } from './client.js';
import type { RuntimeConfig } from './config.js';

export interface ToolTextResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function jsonResult(data: unknown): ToolTextResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): ToolTextResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function dryRunResult(method: string, path: string, body?: unknown): ToolTextResult {
  return jsonResult({
    dryRun: true,
    note: 'COMMERCEBACKEND_DRY_RUN is enabled; no request was sent to the CommerceBackend API.',
    intendedRequest: { method, path, body: body ?? null },
  });
}

async function runMutation(
  config: RuntimeConfig,
  method: 'POST' | 'PATCH',
  path: string,
  body: unknown | undefined,
  send: () => Promise<unknown>
): Promise<ToolTextResult> {
  if (config.dryRun) {
    return dryRunResult(method, path, body);
  }
  const data = await send();
  return jsonResult(data);
}

// Input schemas. Where CommerceBackend already publishes a shared Zod schema in
// @commercebackend/schemas, reuse it directly instead of re-declaring fields
// (see docs/api/mcp-tool-spec.md#tool-set).
const SearchListingsInput = z.object({
  query: z.string().min(1, 'query is required'),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

const GetListingInput = z.object({
  listing_id: z.string().min(1, 'listing_id is required'),
});

const UpdateListingInput = z.object({
  listing_id: z.string().min(1, 'listing_id is required'),
  patch: UpdateListingSchema,
});

const CreateOfferInput = z.object({
  listing_id: z.string().min(1, 'listing_id is required'),
  offer: CreateOfferSchema,
});

const AcceptOfferInput = z.object({
  offer_id: z.string().min(1, 'offer_id is required'),
});

const GetOrderInput = z.object({
  order_id: z.string().min(1, 'order_id is required'),
});

const UpdateFulfillmentInput = UpdateFulfillmentSchema.extend({
  order_id: z.string().min(1, 'order_id is required'),
});

export interface ToolDefinition<Input extends ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  inputSchema: Input;
  mutating: boolean;
  handler: (args: z.infer<Input>, ctx: ToolContext) => Promise<ToolTextResult>;
}

export interface ToolContext {
  client: CommerceBackendClient;
  config: RuntimeConfig;
}

export const toolDefinitions = [
  {
    name: 'commercebackend_search_listings',
    title: 'Search CommerceBackend listings',
    description: 'Search active CommerceBackend listings. Maps to POST /v1/search.',
    inputSchema: SearchListingsInput,
    mutating: false,
    handler: async (args, { client }) => {
      const data = await client.post('/v1/search', {
        query: args.query,
        limit: args.limit ?? 20,
        offset: args.offset ?? 0,
      });
      return jsonResult(data);
    },
  } satisfies ToolDefinition<typeof SearchListingsInput>,

  {
    name: 'commercebackend_get_listing',
    title: 'Get a CommerceBackend listing',
    description: 'Fetch one CommerceBackend listing by ID. Maps to GET /v1/listings/:id.',
    inputSchema: GetListingInput,
    mutating: false,
    handler: async (args, { client }) => {
      const data = await client.get(`/v1/listings/${encodeURIComponent(args.listing_id)}`);
      return jsonResult(data);
    },
  } satisfies ToolDefinition<typeof GetListingInput>,

  {
    name: 'commercebackend_create_listing',
    title: 'Create a CommerceBackend listing',
    description:
      'Create a seller listing. Requires a seller or both-type agent API key. Maps to POST /v1/listings.',
    inputSchema: CreateListingSchema,
    mutating: true,
    handler: async (args, { client, config }) => {
      const path = '/v1/listings';
      return runMutation(config, 'POST', path, args, () => client.post(path, args));
    },
  } satisfies ToolDefinition<typeof CreateListingSchema>,

  {
    name: 'commercebackend_update_listing',
    title: 'Update a CommerceBackend listing',
    description: 'Update a listing owned by the authenticated seller agent. Maps to PATCH /v1/listings/:id.',
    inputSchema: UpdateListingInput,
    mutating: true,
    handler: async (args, { client, config }) => {
      const path = `/v1/listings/${encodeURIComponent(args.listing_id)}`;
      return runMutation(config, 'PATCH', path, args.patch, () => client.patch(path, args.patch));
    },
  } satisfies ToolDefinition<typeof UpdateListingInput>,

  {
    name: 'commercebackend_create_offer',
    title: 'Create a buyer offer',
    description: 'Create a buyer offer for a listing. Maps to POST /v1/listings/:id/offers.',
    inputSchema: CreateOfferInput,
    mutating: true,
    handler: async (args, { client, config }) => {
      const path = `/v1/listings/${encodeURIComponent(args.listing_id)}/offers`;
      return runMutation(config, 'POST', path, args.offer, () => client.post(path, args.offer));
    },
  } satisfies ToolDefinition<typeof CreateOfferInput>,

  {
    name: 'commercebackend_accept_offer',
    title: 'Accept a buyer offer',
    description: 'Accept an offer as the seller agent. Maps to POST /v1/offers/:id/accept.',
    inputSchema: AcceptOfferInput,
    mutating: true,
    handler: async (args, { client, config }) => {
      const path = `/v1/offers/${encodeURIComponent(args.offer_id)}/accept`;
      return runMutation(config, 'POST', path, undefined, () => client.post(path));
    },
  } satisfies ToolDefinition<typeof AcceptOfferInput>,

  {
    name: 'commercebackend_create_checkout_intent',
    title: 'Create a checkout intent',
    description:
      'Create a Stripe-backed checkout intent for a listing or accepted offer. Maps to POST /v1/checkout-intents. ' +
      'The response states the checkout intent status and whether a hosted Stripe Checkout URL was returned; it never ' +
      'claims a payment has completed (that requires Stripe webhook reconciliation on the CommerceBackend API).',
    inputSchema: CreateCheckoutIntentSchema,
    mutating: true,
    handler: async (args, { client, config }) => {
      const path = '/v1/checkout-intents';
      if (config.dryRun) {
        return dryRunResult('POST', path, args);
      }
      const data = (await client.post(path, args)) as {
        checkoutIntent?: { status?: string; checkoutUrl?: string | null };
      };
      const intent = data.checkoutIntent;
      const summary = intent
        ? intent.checkoutUrl
          ? `Checkout intent status "${intent.status}" with a hosted Stripe Checkout URL.`
          : `Checkout intent status "${intent.status}" with no hosted Checkout URL yet (payment not confirmed).`
        : 'CommerceBackend did not return a checkoutIntent object.';
      return jsonResult({ summary, ...data });
    },
  } satisfies ToolDefinition<typeof CreateCheckoutIntentSchema>,

  {
    name: 'commercebackend_get_order',
    title: 'Get a CommerceBackend order',
    description: 'Fetch an order by ID. Maps to GET /v1/orders/:id.',
    inputSchema: GetOrderInput,
    mutating: false,
    handler: async (args, { client }) => {
      const data = await client.get(`/v1/orders/${encodeURIComponent(args.order_id)}`);
      return jsonResult(data);
    },
  } satisfies ToolDefinition<typeof GetOrderInput>,

  {
    name: 'commercebackend_update_fulfillment_status',
    title: 'Update order fulfillment status',
    description:
      'Update fulfillment status as the seller agent. Maps to POST /v1/orders/:id/fulfillment.',
    inputSchema: UpdateFulfillmentInput,
    mutating: true,
    handler: async (args, { client, config }) => {
      const { order_id, ...patch } = args;
      const path = `/v1/orders/${encodeURIComponent(order_id)}/fulfillment`;
      return runMutation(config, 'POST', path, patch, () => client.post(path, patch));
    },
  } satisfies ToolDefinition<typeof UpdateFulfillmentInput>,
] as const;

/**
 * Runs a tool definition's handler against raw (untrusted) arguments, validating
 * them with the tool's Zod schema first. Mirrors what the MCP SDK does internally
 * so the same code path is exercised in tests without needing a live transport.
 */
export async function invokeTool(
  definition: ToolDefinition<ZodTypeAny>,
  rawArgs: unknown,
  ctx: ToolContext
): Promise<ToolTextResult> {
  const parsed = definition.inputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return errorResult(`Invalid input for ${definition.name}: ${parsed.error.message}`);
  }

  try {
    return await definition.handler(parsed.data, ctx);
  } catch (error) {
    if (error instanceof CommerceBackendApiError) {
      return errorResult(`CommerceBackend API error (${error.status}): ${error.message}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(`Unexpected error running ${definition.name}: ${message}`);
  }
}
