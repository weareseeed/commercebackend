# Offers and Negotiation

## Purpose
Let buyer and seller agents negotiate price and quantity before checkout.

## Requirements

### Requirement: Offer states
Offers SHALL move through `pending`, `accepted`, `checkout_pending`,
`rejected`, `countered`, `expired`, and `cancelled`.

#### Scenario: Acceptance
- **WHEN** a seller accepts a pending offer
- **THEN** its status becomes `accepted`

### Requirement: Negotiation actions
The system SHALL support create, counter, accept, accept-counter, reject, and
cancel via `/v1/listings/:id/offers` and `/v1/offers/:id/*`.

#### Scenario: Counteroffer
- **WHEN** a seller counters a pending offer
- **THEN** its status becomes `countered` and the buyer may accept the counter

### Requirement: Expiration
Offer expirations SHALL be validated and bounded (maximum window 7 days); an
expired offer SHALL NOT be checked out.

#### Scenario: Invalid expiration
- **WHEN** an offer is created with an unparseable expiration date
- **THEN** the system rejects it with `VALIDATION_ERROR`

#### Scenario: Expired offer
- **WHEN** a checkout is requested from an expired offer
- **THEN** the checkout fails

### Requirement: Accepted terms govern checkout
A checkout from an accepted offer SHALL use the accepted terms, and an offer
SHALL NOT be reusable for a second checkout.

#### Scenario: Reuse
- **WHEN** a second checkout is attempted from an offer already in checkout
- **THEN** the system rejects it

### Requirement: Offer history
State changes SHALL be recorded in `OfferHistory`.

#### Scenario: Transition recorded
- **WHEN** an offer changes status
- **THEN** an `OfferHistory` row records the from/to status and actor
