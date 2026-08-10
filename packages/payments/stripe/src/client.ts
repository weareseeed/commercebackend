import Stripe from 'stripe';

/**
 * Detects placeholder / mock Stripe secret keys (e.g. the value shipped in
 * `.env.sandbox.example`). Mirrors the same check used in `apps/api/src/env.ts`
 * and the `/health` route so the "mocked" mode reported there and the actual
 * runtime behaviour stay in agreement.
 */
export function isPlaceholderStripeKey(val: string | undefined): boolean {
  if (!val) return false;
  const v = val.toLowerCase();
  return (
    v.includes('placeholder') ||
    v.includes('mock') ||
    v.includes('your_') ||
    v.includes('sk_test_xxx') ||
    v.includes('whsec_xxx') ||
    v === 'sk_test_' ||
    v === 'whsec_'
  );
}

/**
 * A minimal in-process Stripe stand-in for the local/keyless sandbox. It
 * implements only the surface CommerceBackend actually calls:
 *   - `checkout.sessions.create` (checkout-intent creation)
 *   - `webhooks.constructEvent` (webhook route, when signatures are not bypassed)
 *
 * It performs no network I/O and holds no secrets, so the documented
 * "10-minute keyless sandbox" flow works without a real Stripe test key.
 * It is only ever returned for placeholder keys, and never in production.
 */
function createMockStripeClient(): Stripe {
  const mock = {
    checkout: {
      sessions: {
        create: async (
          params: Stripe.Checkout.SessionCreateParams,
          _options?: Stripe.RequestOptions
        ) => {
          const id = `cs_mock_${randomToken()}`;
          return {
            id,
            // A non-routable placeholder URL; the sandbox completes payment via
            // the operator `simulate-complete` endpoint, not this redirect.
            url: `https://sandbox.commercebackend.local/checkout/${id}`,
            object: 'checkout.session',
            mode: params.mode,
            payment_status: 'unpaid',
            status: 'open',
            metadata: params.metadata ?? {},
          } as unknown as Stripe.Checkout.Session;
        },
      },
    },
    webhooks: {
      // With a placeholder key there is no signing secret to verify against, so
      // the "constructed" event is simply the parsed payload. The webhook route
      // still gates this behind BYPASS_STRIPE_SIGNATURE / test mode.
      constructEvent: (rawBody: string | Buffer): Stripe.Event => {
        const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
        return JSON.parse(text) as Stripe.Event;
      },
    },
  };

  return mock as unknown as Stripe;
}

function randomToken(): string {
  // Prefer crypto.randomUUID when available (Node 18+); fall back defensively.
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  if (isPlaceholderStripeKey(secretKey)) {
    // Defence in depth: production already refuses to boot with a placeholder
    // key (see apps/api/src/env.ts), but never fall back to the mock there.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing to use the mock Stripe client in production. Configure a real STRIPE_SECRET_KEY.'
      );
    }
    return createMockStripeClient();
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16' as any,
  });
}
