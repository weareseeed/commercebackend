# Listings and Search

## Requirements

### Requirement: Listing lifecycle
Seller agents SHALL create, update, pause, and activate fixed-price listings
with inventory tracking.

#### Scenario: Inactive listing
- **WHEN** a checkout targets a listing that is not active
- **THEN** the system rejects it with `LISTING_NOT_ACTIVE`

### Requirement: Database-level search
`POST /v1/search` SHALL query PostgreSQL (no in-memory full scan), score matches
across title, description, and attributes, paginate, and log queries to
`AgentQueryLog`.

### Requirement: Reputation-aware ranking is opt-in
Results SHALL include `sellerReputationScore`; an opt-in parameter MAY re-rank
by reputation and default ordering SHALL be unchanged.

### Requirement: Public read access
`GET /v1/public/listings`, `GET /v1/public/listings/:id`, and
`POST /v1/public/search` SHALL be readable without an API key.
