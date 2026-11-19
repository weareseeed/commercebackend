# Operator Visibility

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

### Requirement: Checkout event ledger
`GET /v1/operator/checkout-intents/:id/events` SHALL return an ordered,
synthesized transition history. It is derived from existing fields, not an
append-only table.

### Requirement: Dashboard
The operator dashboard SHALL be read-only and show counts including pending
approvals, and critical events.
