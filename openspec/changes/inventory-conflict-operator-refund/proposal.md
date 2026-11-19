# Change: Operator-triggered refund for inventory conflicts `[HUMAN-LED]`

## Why
`payment_inventory_conflict` leaves captured funds with no order. Detection
exists; remediation is manual in the Stripe Dashboard. Maintainers chose
detect-first, then an operator-triggered refund before any real-money step.
Unattended auto-refund is explicitly not proposed. See
`docs/operations/inventory-conflict-options.md`.

## What Changes
- Operator-only endpoint to refund a `payment_inventory_conflict` intent's
  payment, with an idempotency key and a ledger event.
- New terminal status for refunded conflicts.
- Runbook update.

## Impact
- Affected specs: `payments-and-orders`, `operator-visibility`.
- Money path: dedicated design, Stripe test-mode verification, and explicit
  Seeed approval before code. Required before any Launch 2 work.
