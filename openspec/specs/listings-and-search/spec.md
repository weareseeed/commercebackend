# Listings and Search

## Purpose
Let seller agents publish fixed-price listings and buyer agents find them.

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

#### Scenario: Search is logged
- **WHEN** an agent searches
- **THEN** the query is recorded in `AgentQueryLog` and results are paginated

### Requirement: Reputation-aware ranking is opt-in
Results SHALL include `sellerReputationScore`; an opt-in parameter MAY re-rank
by reputation and default ordering SHALL be unchanged.

#### Scenario: Default ordering
- **WHEN** the opt-in parameter is absent
- **THEN** results keep the default ordering

#### Scenario: Opt-in ordering
- **WHEN** the opt-in parameter is set with sellers of differing reputation
- **THEN** higher-reputation sellers rank first

### Requirement: Public read access
`GET /v1/public/listings`, `GET /v1/public/listings/:id`, and
`POST /v1/public/search` SHALL be readable without an API key.

#### Scenario: No key
- **WHEN** a request without credentials calls `GET /v1/public/listings`
- **THEN** the system returns listings instead of 401
