## ADDED Requirements

### Requirement: Operator-triggered conflict refund
The system SHALL allow only an operator to refund the payment of an intent in
`payment_inventory_conflict`, exactly once per intent, using a Stripe
idempotency key, and SHALL record the result in the checkout event history.
The system SHALL NOT issue this refund automatically.

#### Scenario: Retry
- **WHEN** the operator repeats the request
- **THEN** no second refund is created

#### Scenario: Buyer agent attempts it
- **WHEN** a buyer or seller agent calls the endpoint
- **THEN** the request is rejected with 401
