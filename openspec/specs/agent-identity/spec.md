# Agent Identity

## Purpose
Register buyer/seller agents and authenticate them with bearer API keys.

## Requirements

### Requirement: Key issuance
The system SHALL return a raw API key once at agent registration and SHALL NOT
store it raw.

#### Scenario: Registration
- **WHEN** an agent registers via `POST /v1/agents`
- **THEN** the response contains the raw key once
- **AND** only a derived hash is persisted

### Requirement: Key storage
The system SHALL store keys as `scrypt` hashes with a per-record random salt,
keep legacy shared-salt keys authenticating, and redact keys, hashes, salts,
and Authorization headers from responses and logs.

#### Scenario: Legacy key
- **WHEN** an agent created before per-record salts authenticates
- **THEN** it still authenticates via the legacy path

### Requirement: Agent routes require authentication
Listing, offer, order, and search routes SHALL require agent bearer auth.
Operator routes SHALL require `X-Operator-Key`, compared in constant time.

#### Scenario: Missing credentials
- **WHEN** a request lacks valid credentials
- **THEN** the response is 401

### Requirement: Reputation signal
`GET /v1/agents/me` and agent lookup SHALL expose a read-only reputation
summary (completed vs. failed checkouts, offer acceptance rate).
