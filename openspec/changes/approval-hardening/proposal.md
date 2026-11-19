# Change: Approval hardening `[HUMAN-LED]`

## Why
Policy approval gates every checkout, but the spending limit is advisory,
pending approvals never expire, and the ledger is derived. See
`docs/product/policy-approval-design.md`.

## What Changes
- Enforce the spending limit behind a per-policy flag, only ever moving
  decisions toward human review.
- Add approval expiry with terminal `approval_expired`.
- Add an append-only `CheckoutEvent` table written in the same transaction as
  each state change.
- Add an optional operator notification for new pending approvals.

## Impact
- Affected specs: `checkout-and-approval`, `operator-visibility`.
- Code: `checkout.service.ts`, `orders.service.ts` (CODEOWNERS review),
  Prisma schema, operator routes. Requires design review before code.
