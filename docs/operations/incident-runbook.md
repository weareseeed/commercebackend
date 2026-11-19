# Incident Response Runbook

Use this guide when a critical operational event fires, or a checkout intent
gets stuck in an abnormal state. Both events covered here can involve money
already captured by Stripe with no corresponding order. **Never** attempt to
reconcile, refund, or auto-remediate either one yourself — they need explicit
maintainer review (see [`AGENTS.md`](../../AGENTS.md#money-path-guardrails)).

## 0. Who to page

- **@rsaer** and **@joshua-seeed** (repository maintainers, see
  [`CODEOWNERS`](../../.github/CODEOWNERS)) — page either for any incident
  in this document, especially anything involving captured Stripe funds.
- Check the [Stripe Dashboard](https://dashboard.stripe.com) (test or live
  mode, matching the environment) for the authoritative payment/session
  state before taking any action.

## 1. `CHECKOUT_PERSISTENCE_FAILED`

### What it means

The Stripe Checkout Session was created successfully (a buyer may be able to
complete payment on it), but writing the resulting `checkoutIntentId` /
session state back to the database failed. The code path
(`apps/api/src/services/checkout.service.ts`,
`createAndPersistStripeSession`) catches this, logs a structured
`critical`-level error, best-effort persists a `CriticalEvent` row (code
`CHECKOUT_PERSISTENCE_FAILED`) with the session/intent/offer IDs and the
underlying error, marks the checkout intent `failed` if it can, and returns a
500 to the caller. The risk: the Stripe session may still be valid and
completable even though CommerceBackend's own state says the checkout
failed.

### Detection

- **Operator dashboard** (`apps/landing/operator`, served at `/operator`) —
  the critical events table shows `CHECKOUT_PERSISTENCE_FAILED` counts.
- **API**: `GET /v1/operator/metrics` (requires `X-Operator-Key`) —
  `criticalEvents.byCode.CHECKOUT_PERSISTENCE_FAILED`. See
  [`docs/api/native-api.md`](../api/native-api.md) for the full response
  shape.
- **Structured logs** — search server logs for
  `"code":"CHECKOUT_PERSISTENCE_FAILED"` (JSON, `level: "critical"`).

### What to check

1. Pull the `CriticalEvent` row(s) for this code (via a DB console or an
   operator script) and read the `payload`: `stripeSessionId`,
   `checkoutIntentId`, `offerId`, and `error`.
2. Look up `stripeSessionId` in the Stripe Dashboard. Confirm whether the
   session is `open`, `expired`, or `complete`, and whether a
   PaymentIntent was captured.
3. Look up `checkoutIntentId` in the database. Confirm its current
   `status` (it may already be `failed` from the best-effort recovery
   update, or it may still be stuck at its pre-session status if that
   update also failed).
4. Re-read `error` in the payload alongside the corresponding database logs
   from around the same timestamp to understand *why* the write failed
   (connection loss, constraint violation, timeout, etc.) — this matters
   for the rollback/mitigation decision below, not just the one-off fix.

### Resolution (human-led)

- If the Stripe session shows **no captured payment**: no funds are at
  risk. A maintainer can decide whether to leave the checkout intent
  `failed` (buyer retries) or manually correct its state after confirming
  the underlying data is consistent.
- If the Stripe session shows a **captured payment** with no matching
  order: this is a money-path incident. Do not refund, do not
  fabricate an order, and do not edit database rows directly without a
  maintainer present. Escalate to @rsaer / @joshua-seeed with the
  `CriticalEvent` payload and the Stripe session/PaymentIntent IDs so they
  can decide on manual reconciliation.
- Once the root cause (e.g. a database outage) is understood, decide
  whether it requires a rollback (see [Rollback steps](#3-rollback-steps)
  below) or a follow-up fix, and open an issue either way.

## 2. `payment_inventory_conflict`

### What it means

A Stripe payment was confirmed via webhook, but by the time the order was
about to be created, the listing's available quantity had dropped below what
the checkout intent reserved (a race with another concurrent sale). The code
path (`apps/api/src/services/orders.service.ts`, `handleSuccessfulPayment`)
does **not** create an order and does **not** decrement inventory in this
case; instead it sets the checkout intent's status to
`payment_inventory_conflict` and cancels the associated offer. **Money has
already been captured by Stripe with no order to show for it.**

### Known detection gap

Unlike `CHECKOUT_PERSISTENCE_FAILED`, this state is **not currently written
to `CriticalEvent`** and does **not** appear in
`GET /v1/operator/metrics` or the operator dashboard. This is a real gap —
tracked as the `[HUMAN-LED]` `payment_inventory_conflict` policy item in
[`docs/weekly-roadmap.md`](../weekly-roadmap.md) — because the correct
remediation (auto-refund vs. manual review queue) is a money-path policy
decision that needs maintainer sign-off before any code change ships. Until
that lands, detection is manual:

```sql
SELECT id, "offerId", "stripePaymentIntentId", "updatedAt"
FROM "CheckoutIntent"
WHERE status = 'payment_inventory_conflict'
ORDER BY "updatedAt" DESC;
```

Run this periodically (or after a spike in checkout volume / known
inventory races) against the environment's database.

### What to check

1. For each matching row, look up `stripePaymentIntentId` in the Stripe
   Dashboard and confirm the payment was actually captured.
2. Confirm no `Order` exists for that checkout intent / offer (by design,
   none should).
3. Check the associated `Offer` — it should already be `cancelled` with an
   `OfferHistory` entry noting `OFFER_CANCELLED_INVENTORY_CONFLICT`.

### Resolution (human-led)

- This is strictly a maintainer decision. Do not issue a Stripe refund and
  do not manually create a substitute order without @rsaer / @joshua-seeed
  reviewing the case.
- Escalate with the checkout intent ID, the Stripe PaymentIntent ID, and
  the buyer/seller agent IDs so a maintainer can decide between a refund
  and a manual fulfillment path.

## 3. Rollback steps

If an incident traces back to a bad deploy (not a one-off data race), roll
back the API before doing further data reconciliation:

1. Identify the last known-good deployment (previous Cloud Run revision or
   Railway deployment — see [`docs/deploy/README.md`](../deploy/README.md)
   for the platform-specific mechanics for this environment).
2. Roll traffic back to that revision/deployment using the platform's
   standard rollback action (e.g. Cloud Run "manage traffic" to shift 100%
   to the prior revision, or Railway's deployment history "redeploy").
3. Confirm `GET /v1/operator/metrics` responds normally and error rates
   drop after rollback.
4. Only after the service is stable, resume incident triage (Sections 1–2)
   for any events that occurred during the bad window.
5. Rolling back requires the same deploy access as a normal production
   deploy — follow the existing approval boundaries in
   [`AGENTS.md`](../../AGENTS.md#approval-boundaries); this is not a
   change an agent should perform autonomously outside the normal
   reviewed flow.

## 4. What not to do

- Do not issue Stripe refunds, captures, or cancellations without explicit
  maintainer approval.
- Do not directly mutate `CheckoutIntent`, `Offer`, or `Order` rows in
  production to "fix" a stuck checkout without a maintainer reviewing the
  case first.
- Do not disable webhook signature verification, rate limiting, or other
  safety checks to work around an incident.
- Do not attempt to autonomously reconcile or remediate any money-path
  incident (captured payment with no order, or a mismatched payment
  state) — escalate instead.
- Do not treat a `CriticalEvent` count of zero for
  `payment_inventory_conflict` as "no incidents" — remember the detection
  gap in Section 2 and check the database directly.
