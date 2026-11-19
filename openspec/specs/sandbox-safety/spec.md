# Sandbox Safety

## Purpose
Keep the hosted sandbox test-mode only and resistant to abuse.

## Requirements

### Requirement: Test mode only
With `SANDBOX_MODE`, the system SHALL refuse to start with an `sk_live_` Stripe
key, and the health check SHALL report the Stripe mode.

#### Scenario: Live key
- **WHEN** `SANDBOX_MODE` is enabled with an `sk_live_` Stripe key
- **THEN** startup fails

### Requirement: Operator-only reset and simulation
`POST /v1/sandbox/reset` and
`POST /v1/sandbox/checkout-intents/:id/simulate-complete` SHALL require the
operator key.

#### Scenario: Agent key
- **WHEN** an agent bearer key calls the reset endpoint
- **THEN** the request is rejected

### Requirement: Seeded fixtures
`GET /v1/sandbox/fixtures` SHALL expose deterministic fixture metadata.

#### Scenario: Fixture lookup
- **WHEN** a client requests `GET /v1/sandbox/fixtures`
- **THEN** it receives identifiers for the seeded agents, listings, and policies

### Requirement: Abuse controls
The API SHALL apply per-IP rate limits (health and webhooks exempt), a
configurable CORS allowlist, body-size limits, and stricter limits on
registration and search.

#### Scenario: Rate limit
- **WHEN** a client exceeds the registration limit
- **THEN** the API responds 429
