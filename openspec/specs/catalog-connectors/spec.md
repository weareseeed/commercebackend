# Catalog Connectors

## Requirements

### Requirement: Read-only imports
Shopify, Square, BigCommerce, and WooCommerce connectors SHALL import catalogs
into the canonical imported-catalog model as agent-facing listings, on operator
trigger only, recording a sync log with outcome and failures.

### Requirement: No live-store reach by default
Connectors SHALL be fixture-driven by default and MAY run live only against the
operator's own sandbox/store account. There is no scheduled sync and no
checkout through a third-party store.
