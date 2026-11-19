# Purchase policy and approval: remaining design

Status: **design proposal for maintainer review. Nothing here is implemented.**
It touches checkout, so it is `[HUMAN-LED]` per `AGENTS.md`; do not build it
from the weekly routine.

## What exists today

- `PurchasePolicy` per buyer agent (operator-created via
  `POST /v1/agents/:buyerAgentId/purchase-policies`): allowed listing types and
  sellers, `maxAutoApproveAmount`, `requireHumanApprovalAboveAmount`,
  `requireHumanApprovalForOffers`, optional spending limit.
- `CheckoutService.evaluatePurchasePolicy` runs before any Stripe session. No
  enabled policy for the currency means `human_approval_required`.
- `human_approval_required` intents have no Stripe session. An operator
  approves (`POST /v1/checkout-intents/:id/approve`, creates the session,
  status `human_approved`) or rejects (`.../reject`, status `human_rejected`,
  offer reverts to `accepted`).
- `spendingLimitSignal` is computed and stored, but never changes the decision.
- Transitions are readable through the operator checkout event ledger.

## Gaps this proposal addresses

1. **Spending limit is advisory.** A buyer can exceed its budget with no
   approval prompt.
2. **Pending approvals never expire.** An intent can sit in
   `human_approval_required` indefinitely, holding an offer in
   `checkout_pending`.
3. **No operator visibility or notification.** Pending approvals are not listed
   on the operator metrics endpoint or dashboard, and nothing tells an operator
   one is waiting.
4. **The ledger is derived**, not append-only. It is rebuilt from existing
   columns, so a transition that overwrites a column (for example a re-approval)
   loses history.
5. **Policy decision reasons are not recorded.** `policyDecision` says
   *what*, not *why* (amount, seller, type, offer, limit).

## Proposal

### 1. Enforce the spending limit (decision change, behind a flag)

When `spendingLimitSignal.wouldExceedLimit` is true, the decision becomes
`human_approval_required` (never auto-reject). This only ever moves a checkout
from auto-approved to needing a human, so it cannot move money that would not
have moved before. Ship disabled by default via a per-policy
`enforceSpendingLimit` boolean, then enable on sandbox policies.

### 2. Record the reason

Add `policyDecisionReasons String[]` on `CheckoutIntent` (for example
`AMOUNT_ABOVE_AUTO_APPROVE`, `SELLER_NOT_ALLOWED`, `LISTING_TYPE_NOT_ALLOWED`,
`OFFER_REQUIRES_APPROVAL`, `NO_POLICY`, `SPENDING_LIMIT_EXCEEDED`). Surface it
on the intent response and the ledger.

### 3. Approval expiry

Add `approvalExpiresAt`. Expired pending intents move to terminal
`approval_expired` (offer reverts to `accepted`, same as rejection). Expiry is
evaluated lazily on read/approve plus a small operator-triggered or scheduled
sweep. Approving an expired intent fails with `APPROVAL_EXPIRED`. Default
window is configurable (proposed: 24h).

### 4. Pending-approval visibility

Add `pendingApprovals` (count and oldest age) to `GET /v1/operator/metrics`,
a "Pending approvals" list on the operator dashboard, and an optional
`APPROVAL_WEBHOOK_URL` for an operator-side notification. No buyer-agent path
may approve.

### 5. Append-only event table

Add a `CheckoutEvent` table written in the same transaction as each state
change. The ledger endpoint reads from it, with the derived view as a fallback
for intents created before the migration. This also gives the future
refund/conflict work a place to record events.

## Safety invariants (must hold, with tests)

- No Stripe session is created for a `human_approval_required` intent.
- Only an operator key can approve; buyer agents cannot approve their own
  checkouts or create or edit policies.
- Enforcement can only move decisions toward more human review.
- Expiry and rejection never create a Stripe session and leave an auditable
  terminal state.
- Webhook signature verification and order idempotency are untouched.

## Suggested order

1. Reasons (2) and pending-approval visibility (4): read-only, low risk.
2. Append-only events (5).
3. Expiry (3).
4. Spending-limit enforcement (1), flag off, then on for sandbox.

## Open questions for the maintainers

- Default approval window, and should it differ for offer-based checkouts?
- Should an approver be recorded per approval (single operator key today, so no
  individual attribution)?
- Which notification channel do operators actually watch (webhook, email, Slack)?
