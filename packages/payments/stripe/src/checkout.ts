import { getStripeClient } from './client';

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
}

export async function createStripeCheckoutSession(input: CreateStripeSessionInput) {
  const stripe = getStripeClient();

  const formattedSuccessUrl = input.successUrl.replace(
    '{CHECKOUT_INTENT_ID}',
    input.checkoutIntentId
  );
  const formattedCancelUrl = input.cancelUrl.replace(
    '{CHECKOUT_INTENT_ID}',
    input.checkoutIntentId
  );

  const session = await stripe.checkout.sessions.create({
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
    },
    success_url: formattedSuccessUrl,
    cancel_url: formattedCancelUrl,
  });

  return {
    id: session.id,
    url: session.url,
  };
}
