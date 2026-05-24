# Stripe Integration - CommerceBackend v0.1

This document explains the Stripe Checkout integration and webhook processing flow in CommerceBackend v0.1.

## 1. Stripe Checkout Flow

The checkout loop is designed to prevent orphan payment sessions and ensure secure payments:

1. **Checkout Intent (DB)**: The buyer agent posts to `/v1/checkout-intents`. The system validates listing active status and quantity, computes the price server-side, and creates a `CheckoutIntent` row in the database with status `open`.
2. **Stripe Session**: The system makes a call to Stripe to create a hosted Checkout Session, passing an `idempotencyKey` derived from the `checkoutIntentId` (`checkout_intent_stripe_${checkoutIntent.id}`) to prevent double creation.
3. **Session Persistence**:
   - On Stripe Success: The `CheckoutIntent` row is updated with `stripeCheckoutSessionId` and `checkoutUrl`.
   - On Stripe Failure: The `CheckoutIntent` is marked `failed` in the database, preventing orphaned checkout attempts.
4. **Metadata**: The Stripe session is created with the following metadata structure:
   - `checkoutIntentId`
   - `listingId`
   - `buyerAgentId`
   - `sellerAgentId`
   - `quantity`

---

## 2. Webhook Handling & Idempotency

Stripe sends a POST event `checkout.session.completed` once credit card payment is successful. The webhook endpoint `/v1/webhooks/stripe` handles it as follows:

- **Signature Verification**: Validates the webhook payload using `stripe-signature` and the webhook secret.
- **Prisma Transaction & Locking**:
  - The webhook handler locks the `Listing` row (`SELECT ... FOR UPDATE`) to prevent concurrent updates.
  - Checks if the checkout intent status is already `paid` or `payment_inventory_conflict`. If so, it returns `200 OK` idempotently without further database updates.
  - Checks if stock is available (`quantityAvailable >= quantity`).
  - If stock is sufficient: decrements inventory, creates exactly one `Order`, marks the `CheckoutIntent` as `paid`, and commits.
  - If stock is insufficient (concurrency conflict): marks the checkout intent as `payment_inventory_conflict` without creating an order or decrementing stock, and commits.

---

## 3. Local Webhook Testing

To test Stripe checkout payment loops locally, use the Stripe CLI:

1. **Download Stripe CLI** and authenticate:
   ```bash
   stripe login
   ```
2. **Forward Webhook Events** to your local API:
   ```bash
   stripe listen --forward-to http://127.0.0.1:4000/v1/webhooks/stripe
   ```
3. **Configure Environment**: Copy the webhook signing secret printed in the console (e.g. `whsec_...`) and update `STRIPE_WEBHOOK_SECRET` in your local `.env` file.

---

## 4. Known Payment Limitations in v0.1

- **No Stripe Connect**: Payouts to sellers are not automated. Merchant balances must be managed externally.
- **No Refunds/Disputes**: If a buyer payment triggers a `payment_inventory_conflict` (over-purchasing due to concurrency), the payment is collected by Stripe, but no order is placed. The system marks it `payment_inventory_conflict` and requires the platform operator to manually issue a refund or handle fulfillment.

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

