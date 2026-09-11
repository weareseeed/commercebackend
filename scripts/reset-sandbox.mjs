#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const operatorKey = process.env.OPERATOR_API_KEY;

if (!operatorKey) {
  console.error('OPERATOR_API_KEY is required to reset sandbox fixtures.');
  process.exit(1);
}

async function main() {
  const response = await fetch(`${baseUrl}/v1/sandbox/reset`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-operator-key': operatorKey,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const code = data?.error?.code || 'HTTP_ERROR';
    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`${code}: ${message}`);
  }

  console.log(`Sandbox reset complete: ${baseUrl}`);
  console.log(`Seller agent: ${data.manifest.sellerAgentId}`);
  console.log(`Auto buyer: ${data.manifest.buyerAgentIds.autoApproved}`);
  console.log(`Approval buyer: ${data.manifest.buyerAgentIds.approvalRequired}`);
  console.log(`Listings: ${Object.keys(data.manifest.listingIds).length}`);
  console.log(`Offers: ${Object.keys(data.manifest.offerIds).length}`);
  console.log(`Checkout intents: ${Object.keys(data.manifest.checkoutIntentIds).length}`);
}

main().catch((error) => {
  console.error(`Sandbox reset failed: ${error.message}`);
  process.exit(1);
});
