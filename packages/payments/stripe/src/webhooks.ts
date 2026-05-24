import Stripe from 'stripe';
import { getStripeClient } from './client';

export function constructStripeEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
