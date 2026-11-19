## MODIFIED Requirements

### Requirement: Checkout event ledger
The ledger SHALL read from an append-only `CheckoutEvent` table written in the
same transaction as each state change, falling back to the derived history for
intents created before the table existed.

#### Scenario: New intent
- **WHEN** an intent changes state
- **THEN** a `CheckoutEvent` row is written in the same transaction

#### Scenario: Older intent
- **WHEN** an intent was created before the table existed
- **THEN** the ledger returns the derived history
