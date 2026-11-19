## MODIFIED Requirements

### Requirement: Spending limit is advisory
When a policy sets `enforceSpendingLimit` and `spendingLimitSignal.wouldExceedLimit`
is true, the system SHALL set the intent to `human_approval_required` with
reason `SPENDING_LIMIT_EXCEEDED`. The system SHALL NOT auto-reject, and SHALL
leave behavior unchanged for policies without the flag.

#### Scenario: Enforced and over the limit
- **WHEN** the policy has `enforceSpendingLimit` and the checkout would exceed the limit
- **THEN** the intent is `human_approval_required` with reason `SPENDING_LIMIT_EXCEEDED`

#### Scenario: Flag off
- **WHEN** the policy does not set `enforceSpendingLimit`
- **THEN** behavior is unchanged from today

## ADDED Requirements

### Requirement: Approval expiry
A `human_approval_required` intent SHALL expire after its approval window,
becoming terminal `approval_expired`, reverting any linked offer to
`accepted`, and creating no Stripe session.

#### Scenario: Approve after expiry
- **WHEN** an operator approves an expired intent
- **THEN** the request fails with `APPROVAL_EXPIRED`

#### Scenario: Expiry reverts the offer
- **WHEN** an intent linked to an offer expires
- **THEN** the offer returns to `accepted` and no Stripe session exists
