# Checkout and Human Approval

## Requirements

### Requirement: Persist before payment
A checkout intent SHALL be persisted before a Stripe session is created, using
Stripe idempotency keys.

### Requirement: Policy evaluation before payment
The system SHALL evaluate the buyer agent's enabled `PurchasePolicy` (matching
currency) before any Stripe session exists.

#### Scenario: No policy
- **WHEN** the buyer has no enabled policy for the listing currency
- **THEN** the intent is `human_approval_required` with reason `NO_POLICY`

#### Scenario: Within policy
- **WHEN** listing type and seller are allowed, the amount is within the
  auto-approve and approval thresholds, and no offer-approval rule applies
- **THEN** the intent is auto-approved and a Stripe session is created

#### Scenario: Outside policy
- **WHEN** any rule fails
- **THEN** the intent is `human_approval_required`, has no Stripe session or
  checkout URL, and lists every failing reason in `policyDecisionReasons`

### Requirement: Operator-only approval
Only an operator (`X-Operator-Key`) SHALL approve or reject; buyer agents
SHALL NOT approve their own checkouts or create policies.

#### Scenario: Approve
- **WHEN** an operator approves a `human_approval_required` intent with
  redirect URLs, an active listing, and sufficient stock
- **THEN** a Stripe session is created and status becomes `human_approved`

#### Scenario: Reject
- **WHEN** an operator rejects it
- **THEN** status becomes `human_rejected`, no Stripe session is created, and
  any linked offer reverts to `accepted`

### Requirement: Spending limit is advisory
`spendingLimitSignal` SHALL report whether a checkout would exceed an optional
policy budget and SHALL NOT change `status` or `policyDecision`.
