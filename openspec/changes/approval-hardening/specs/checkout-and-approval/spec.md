## MODIFIED Requirements

### Requirement: Spending limit is advisory
When a policy sets `enforceSpendingLimit` and `spendingLimitSignal.wouldExceedLimit`
is true, the system SHALL set the intent to `human_approval_required` with
reason `SPENDING_LIMIT_EXCEEDED`. The system SHALL NOT auto-reject, and SHALL
leave behavior unchanged for policies without the flag.

## ADDED Requirements

### Requirement: Approval expiry
A `human_approval_required` intent SHALL expire after its approval window,
becoming terminal `approval_expired`, reverting any linked offer to
`accepted`, and creating no Stripe session.

#### Scenario: Approve after expiry
- **WHEN** an operator approves an expired intent
- **THEN** the request fails with `APPROVAL_EXPIRED`
