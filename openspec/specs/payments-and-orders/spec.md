# Payments and Orders

## Purpose
Confirm payment through Stripe webhooks and create orders safely.

## Requirements

### Requirement: Webhook-created orders
Orders SHALL be created only from verified `checkout.session.completed`
webhooks, idempotently, decrementing inventory under a row lock.

#### Scenario: Duplicate delivery
- **WHEN** the same webhook is delivered twice
- **THEN** exactly one order exists

### Requirement: Signature verification
Stripe signature verification SHALL be enforced; `BYPASS_STRIPE_SIGNATURE=true`
SHALL be rejected in production.

#### Scenario: Bad signature
- **WHEN** a webhook arrives with an invalid Stripe signature
- **THEN** the system rejects it and creates no order

#### Scenario: Bypass flag in production
- **WHEN** the API starts in production with `BYPASS_STRIPE_SIGNATURE=true`
- **THEN** startup fails

### Requirement: Inventory conflict handling
If stock is insufficient at webhook time the system SHALL create no order,
leave inventory unchanged (never negative), set the intent to
`payment_inventory_conflict`, cancel the linked offer, and record a
`PAYMENT_INVENTORY_CONFLICT` critical event and structured log. The system
SHALL NOT refund or move money in this case.

#### Scenario: Conflict
- **WHEN** a payment completes after inventory is exhausted
- **THEN** no order is created and a conflict event is recorded

#### Scenario: Webhook retry
- **WHEN** the conflicting webhook is retried
- **THEN** exactly one conflict event exists

### Requirement: Fulfillment
Seller agents SHALL update fulfillment status; buyer agents SHALL read it.

#### Scenario: Seller update
- **WHEN** a seller agent posts a fulfillment status for its order
- **THEN** the buyer agent can read the new status

### Requirement: Persistence failure
If persisting a created Stripe session fails, the system SHALL log
`CHECKOUT_PERSISTENCE_FAILED`, record a critical event, and return an error.

#### Scenario: Database write fails
- **WHEN** writing the Stripe session back to the database fails
- **THEN** a `CHECKOUT_PERSISTENCE_FAILED` event is recorded and the request errors
