# Catalog Connectors

## Purpose
Import merchant catalogs into the canonical model without owning third-party
checkout.

## Requirements

### Requirement: Read-only imports
Shopify, Square, BigCommerce, and WooCommerce connectors SHALL import catalogs
into the canonical imported-catalog model as agent-facing listings, on operator
trigger only, recording a sync log with outcome and failures.

#### Scenario: Fixture import
- **WHEN** an operator triggers a connector sync against a fixture catalog
- **THEN** listings are created and a sync log records the outcome

### Requirement: No live-store reach by default
Connectors SHALL be fixture-driven by default and MAY run live only against the
operator's own sandbox/store account. There is no scheduled sync and no
checkout through a third-party store.

#### Scenario: No scheduler
- **WHEN** no operator triggers a sync
- **THEN** no import occurs
