# Sandbox Safety

## Requirements

### Requirement: Test mode only
With `SANDBOX_MODE`, the system SHALL refuse to start with an `sk_live_` Stripe
key, and the health check SHALL report the Stripe mode.

### Requirement: Operator-only reset and simulation
`POST /v1/sandbox/reset` and `POST /v1/sandbox/checkout-intents/:id/simulate-complete`
SHALL require the operator key.

### Requirement: Seeded fixtures
`GET /v1/sandbox/fixtures` SHALL expose deterministic fixture metadata.

### Requirement: Abuse controls
The API SHALL apply per-IP rate limits (health and webhooks exempt), a
configurable CORS allowlist, body-size limits, and stricter limits on
registration and search.
