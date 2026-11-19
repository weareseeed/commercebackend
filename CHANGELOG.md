# Changelog

All notable changes to CommerceBackend are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions below have
git tags; release notes live in `docs/release-notes-*.md`.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to
Seeed Studio.

## [Unreleased]

Shipped on `master` since v0.2.2 (not yet tagged). PR numbers refer to
`weareseeed/commercebackend`.

### Added
- Purchase-policy spending-limit signal on checkout intents (read-only, does not
  block checkout) (#179).
- `policyDecisionReasons` on checkout intents, explaining why human approval was
  required (informational) (#207).
- `PAYMENT_INVENTORY_CONFLICT` critical event and structured log when a payment
  completes after inventory is exhausted. No refund is issued (#207).
- `pendingApprovals` on `GET /v1/operator/metrics` and the operator dashboard
  (#207).
- Operator metrics endpoint and read-only operator dashboard (#153, #156).
- Checkout event ledger endpoint and dashboard lookup (#188, #203).
- Per-agent reputation signal and opt-in reputation-aware search ranking (#167,
  #199).
- MCP server (`packages/mcp`), ACP and UCP adapters for a documented subset
  (#151, #157, #158).
- Read-only catalog connectors for Square, Shopify, BigCommerce, and
  WooCommerce (#160, #165, #173, #184).
- Agent-to-agent negotiation example (#193) and an incident runbook (#168).

### Changed
- Listing search runs in PostgreSQL instead of an in-memory scan (#148).
- API keys use a per-record salt; legacy keys keep working (#155).
- Rate limiting is skipped under Vitest, and proxy trust is configurable through
  `TRUST_PROXY` (#147).

## [0.2.2] - 2026-08-10

Public sandbox live at `https://api.commercebackend.com` (Stripe test mode
only), containerized deploy path, and operational hardening: per-IP rate
limiting, configurable CORS allowlist, constant-time operator-key comparison,
request body-size limits, and a strict cap on registration and search. See
[`docs/release-notes-v0.2.2.md`](docs/release-notes-v0.2.2.md).

## [0.2.1] - 2026-05-26

Post-v0.2 hardening and discovery verification.

## [0.2.0] - 2026-05-24

Offers API for agent-native negotiation (offer, counteroffer, accept, reject,
cancel), checkout failure hardening, and agent discovery metadata. See
[`docs/release-notes-v0.2.0.md`](docs/release-notes-v0.2.0.md).

## [0.1.1] - 2026-05-24

Initial tagged release of the agent-commerce loop. No release notes were
written for this tag.
