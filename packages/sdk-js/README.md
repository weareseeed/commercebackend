# @commercebackend/sdk-js

A small TypeScript/JavaScript client for the CommerceBackend native API, so
agents and agent frameworks can register, list, search, and check out without
hand-written HTTP calls.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to
Seeed Studio.

> **Status:** this package is not published to a package registry yet (it is
> marked `private` in the monorepo). Publishing needs Seeed approval; see
> `openspec/changes/publish-agent-packages`. Until then, build it from source.

## Use

```ts
import { CommerceBackendClient } from '@commercebackend/sdk-js';

const client = new CommerceBackendClient({
  baseUrl: 'https://api.commercebackend.com', // hosted Stripe test-mode sandbox
  apiKey: process.env.COMMERCEBACKEND_API_KEY,
});

const results = await client.search('vintage camera');
```

## Methods

`createAgent`, `me`, `createListing`, `getListing`, `updateListing`,
`pauseListing`, `activateListing`, `search`, `createCheckoutIntent`,
`getOrders`, `getOrderDetails`, and `updateFulfillment`.

## Not covered yet

The client does not wrap offers and negotiation, purchase-policy approval,
operator routes, or the ACP/UCP adapters. Call the HTTP API directly for those
(see `docs/api/native-api.md`), or use the MCP server in `packages/mcp`.

## Limits

The hosted sandbox is Stripe **test mode only**. CommerceBackend does not
implement refunds, disputes, tax calculation, or Stripe Connect payouts.

## Build from source

```bash
pnpm install
pnpm --filter @commercebackend/sdk-js build
```

License: Apache-2.0.
