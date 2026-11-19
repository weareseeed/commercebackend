# Offers and Negotiation

## Requirements

### Requirement: Offer states
Offers SHALL move through `pending`, `accepted`, `checkout_pending`,
`rejected`, `countered`, `expired`, and `cancelled`.

### Requirement: Negotiation actions
The system SHALL support create, counter, accept, accept-counter, reject, and
cancel via `/v1/listings/:id/offers` and `/v1/offers/:id/*`.

### Requirement: Expiration
Offer expirations SHALL be validated and bounded (maximum window 7 days); an
expired offer SHALL NOT be checked out.

### Requirement: Accepted terms govern checkout
A checkout from an accepted offer SHALL use the accepted terms, and an offer
SHALL NOT be reusable for a second checkout.

### Requirement: Offer history
State changes SHALL be recorded in `OfferHistory`.
