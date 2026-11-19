## MODIFIED Requirements

### Requirement: Checkout event ledger
The ledger SHALL read from an append-only `CheckoutEvent` table written in the
same transaction as each state change, falling back to the derived history for
intents created before the table existed.
