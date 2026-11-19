# Operator Visibility

## Purpose
Give operators read-only visibility into system state and payment-path
incidents.

## Requirements

### Requirement: Metrics
`GET /v1/operator/metrics` SHALL (operator-gated, rate limited) return counts
of agents, listings, offers, checkout intents, orders, and query logs; critical
event totals by code (`CHECKOUT_PERSISTENCE_FAILED`,
`PAYMENT_INVENTORY_CONFLICT`); and `pendingApprovals { count,
oldestRequestedAt }` computed by a database aggregate.

#### Scenario: Empty database
- **WHEN** nothing exists
- **THEN** counts are zero and `pendingApprovals` is `{ count: 0,
  oldestRequestedAt: null }`

#### Scenario: Pending approvals
- **WHEN** two intents are in `human_approval_required`
- **THEN** `pendingApprovals.count` is 2 and `oldestRequestedAt` is the earlier
  request time

#### Scenario: No operator key
- **WHEN** the request lacks a valid operator key
- **THEN** the response is 401

### Requirement: Checkout event ledger
`GET /v1/operator/checkout-intents/:id/events` SHALL return an ordered,
synthesized transition history. It is derived from existing fields, not an
append-only table.

#### Scenario: Paid intent
- **WHEN** an operator requests the history of a paid intent
- **THEN** the events are ordered by time and include `created` and `paid`

### Requirement: Dashboard
The operator dashboard SHALL be read-only and show counts including pending
approvals, and critical events.

#### Scenario: Read-only
- **WHEN** an operator uses the dashboard
- **THEN** it issues only read requests to the operator API
