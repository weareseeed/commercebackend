import { getStripeClient } from './client';

function isMockStripeMode() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.toLowerCase() ?? '';

  return (
    process.env.BYPASS_STRIPE_SIGNATURE === 'true' ||
    secretKey.includes('mock') ||
    secretKey.includes('placeholder') ||
    secretKey === 'sk_test_' ||
    secretKey === ''
  );
}

export interface CreateStripeSessionInput {
  checkoutIntentId: string;
  listingId: string;
  title: string;
  priceAmount: number;
  quantity: number;
  currency: string;
  buyerAgentId: string;
  sellerAgentId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}

export async function createStripeCheckoutSession(input: CreateStripeSessionInput) {
  const formattedSuccessUrl = input.successUrl.replace(
    '{CHECKOUT_INTENT_ID}',
    input.checkoutIntentId
  );
  const formattedCancelUrl = input.cancelUrl.replace(
    '{CHECKOUT_INTENT_ID}',
    input.checkoutIntentId
  );

  if (isMockStripeMode()) {
    return {
      id: `cs_mock_${input.checkoutIntentId}`,
      url: `https://checkout.stripe.com/pay/cs_mock_${input.checkoutIntentId}`,
    };
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: {
              name: input.title,
            },
            unit_amount: input.priceAmount,
          },
          quantity: input.quantity,
        },
      ],
      metadata: {
        checkoutIntentId: input.checkoutIntentId,
        listingId: input.listingId,
        buyerAgentId: input.buyerAgentId,
        sellerAgentId: input.sellerAgentId,
        quantity: input.quantity.toString(),
      },
      success_url: formattedSuccessUrl,
      cancel_url: formattedCancelUrl,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );

  return {
    id: session.id,
    url: session.url,
  };
}
